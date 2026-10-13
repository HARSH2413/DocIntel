import time
import re
from app.interfaces.vector_store import IVectorStore
from app.interfaces.lexical_store import ILexicalStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.llm import ILLM
from app.interfaces.reranker import IReranker
from app.core.logger import logger
from app.core.config import settings
from app.services.retrieval_engine import RetrievalEngine
from app.services.evidence_engine import EvidenceEngine
from app.services.query_router import RuleBasedQueryRouter
from app.services.query_expansion import QueryExpansionService
from app.services.answer_planner import AnswerPlan, FORMAT_GUIDES, part_is_covered, plan_answer
from app.utils.citation_validator import parse_answer_lines

# Multi-part questions: chunks kept per search list (whole question + each part), and the cap
# on total evidence so the context stays within what the model handles well.
EVIDENCE_PER_PART = 2
MAX_MULTI_PART_EVIDENCE = 10


class ChatService:
    def __init__(
        self,
        db: IVectorStore,
        lexical_store: ILexicalStore,
        embedder: IEmbedder,
        llm: ILLM,
        reranker: IReranker,
        retrieval_top_k: int = 20,
        reranker_top_k: int = 5,
        min_relevance_score: float = 0.15,
        min_relevance_score_low: float = 0.05,
    ):
        self.db = db
        self.lexical_store = lexical_store
        self.embedder = embedder
        self.llm = llm
        self.reranker = reranker
        self.retrieval_top_k = retrieval_top_k
        self.reranker_top_k = reranker_top_k
        
        self.router = RuleBasedQueryRouter()
        self.query_expansion = QueryExpansionService(llm=llm)
        
        self.retrieval_engine = RetrievalEngine(
            db=db,
            lexical_store=lexical_store,
            embedder=embedder,
            reranker=reranker,
            retrieval_top_k=retrieval_top_k,
            reranker_top_k=reranker_top_k,
        )
        self.evidence_engine = EvidenceEngine(
            db=db,
            min_relevance_score=min_relevance_score,
            min_relevance_score_low=min_relevance_score_low,
            enable_neighbor_context=settings.ENABLE_NEIGHBOR_CONTEXT,
        )

    def ask_question(self, question: str, box_id: str, session_id: str) -> dict:
        total_start = time.perf_counter()
        fallback_phrase = settings.FALLBACK_PHRASE

        # 1. Save user question to stateful memory
        try:
            self.db.save_chat_message(session_id=session_id, role="user", content=question)
        except Exception as e:
            logger.error(f"Failed to save user message: {e}")

        # 2. Fetch history (deterministic truncation)
        chat_history = []
        try:
            chat_history = self.db.get_chat_history(session_id=session_id, box_id=box_id)
        except Exception as e:
            logger.warning(f"Failed to fetch chat history, continuing without it: {e}")
            
        recent_history = chat_history[-8:] if len(chat_history) > 8 else chat_history

        # 3. Query Routing
        route_decision = self.router.route(question, len(recent_history))
        route = route_decision["route"]
        logger.info(f"Router decided route: {route}")
        
        rewritten_query = question
        variants = []
        
        rewrite_start = time.perf_counter()
        if route == "follow_up":
            logger.info("Executing follow_up query expansion (1 LLM call)...")
            expansion = self.query_expansion.expand(question, recent_history)
            rewritten_query = expansion["rewritten_query"]
            variants = expansion["variants"]
        rewrite_ms = (time.perf_counter() - rewrite_start) * 1000

        # Question type picks the answer structure; multi-part questions get per-part evidence.
        plan = plan_answer(rewritten_query)
        logger.info(f"Answer plan: type={plan.question_type} | parts={len(plan.parts)}")

        # 4. Retrieval Pipeline (First Pass)
        retrieval_start = time.perf_counter()
        if plan.is_multi_part:
            retrieved_docs = self._retrieve_for_parts(rewritten_query, plan, box_id)
        else:
            retrieved_docs = self.retrieval_engine.retrieve_documents(search_query=rewritten_query, box_id=box_id)
        retrieval_ms = (time.perf_counter() - retrieval_start) * 1000

        # 5. Evidence Gate
        retrieved_docs = self.evidence_engine.filter_and_expand(retrieved_docs)
        top_score = max((self.evidence_engine.get_doc_relevance_score(doc) for doc in retrieved_docs), default=0.0)
        
        rescue_used = False
        closest_matches = []
        
        if not retrieved_docs or top_score < settings.ANSWER_MIN_RELEVANCE_SCORE:
            logger.info(f"First pass evidence weak (top_score={top_score:.3f}). Triggering Rescue Pass.")
            rescue_used = True
            rescue_start = time.perf_counter()
            
            if route == "normal":
                logger.info("Executing normal rescue query expansion (1 LLM call)...")
                expansion = self.query_expansion.expand(question, [])
                rewritten_query = expansion["rewritten_query"]
                variants = expansion["variants"]
                
            queries_to_run = [rewritten_query] + variants
            logger.debug(f"Rescue running queries: {queries_to_run}")
            
            retrieved_docs = self.retrieval_engine.retrieve_documents_multi(
                queries=queries_to_run, 
                box_id=box_id, 
                reranker_query=rewritten_query
            )
            rescue_ms = (time.perf_counter() - rescue_start) * 1000
            retrieval_ms += rescue_ms
            
            retrieved_docs = self.evidence_engine.filter_and_expand(retrieved_docs)
            top_score = max((self.evidence_engine.get_doc_relevance_score(doc) for doc in retrieved_docs), default=0.0)
            
        # 6. Final Evidence Check
        if not retrieved_docs or top_score < settings.ANSWER_MIN_RELEVANCE_SCORE:
            logger.info(f"Rescue pass still weak (top_score={top_score:.3f}). Returning closest matches.")
            # Map retrieved docs to closest matches citations
            for doc in retrieved_docs[:3]:
                closest_matches.append({
                    "document_id": doc.get("document_id"),
                    "filename": doc.get("filename", ""),
                    "chunk_index": doc.get("chunk_index"),
                    "section_title": doc.get("section_title"),
                    "content": doc.get("content", ""),
                    "rerank_score": doc.get("rerank_score", None)
                })
                
            try:
                self.db.save_chat_message(session_id=session_id, role="assistant", content=fallback_phrase)
            except Exception as e:
                pass
                
            return {
                "answer": fallback_phrase,
                "citations": [],
                "closest_matches": closest_matches,
                "session_id": session_id,
                "confidence": "low",
            }

        # 7. Context Builder
        retrieved_docs = self.evidence_engine.assign_evidence_ids(retrieved_docs)
        context_text = self.evidence_engine.build_context_text(retrieved_docs)

        # 8. Prompt Building
        system_prompt = self._build_system_prompt(
            context_text=context_text,
            fallback_phrase=fallback_phrase,
            plan=plan,
        )

        messages = [{"role": "system", "content": system_prompt}]
        for msg in recent_history:
            # Avoid duplicating the current question if it was already fetched from history
            if msg.get("role") == "user" and msg.get("content") == question:
                continue
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        # Always explicitly append the current user question
        messages.append({"role": "user", "content": question})

        # 9. Call Final LLM
        llm_start = time.perf_counter()
        try:
            answer = self.llm.chat_with_messages(messages=messages, temperature=0.0)
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            answer = fallback_phrase
        llm_ms = (time.perf_counter() - llm_start) * 1000

        # 10. Citation Integrity Check (Firewall)
        answer, citations, unsupported_sentences, stripped_citations = self._validate_and_build_citations(answer, retrieved_docs, fallback_phrase)
        retried = False
        
        # Retry once if answer exists but citations failed completely and LLM did not already say fallback phrase
        if not citations and fallback_phrase not in answer:
            logger.info("Answer generated but zero valid citations. Retrying once with citation enforcement prompt.")
            retry_prompt = (
                "You previously answered without using the required evidence citations. "
                "Please rewrite your answer citing the supporting evidence IDs using [E1], [E2], etc. from the context. "
                "Keep the same structure (headings, lists, tables). "
                f"If the context contains absolutely zero information to answer the question, output exactly: '{fallback_phrase}'"
            )
            
            messages.append({"role": "assistant", "content": answer})
            messages.append({"role": "user", "content": retry_prompt})
            
            try:
                answer = self.llm.chat_with_messages(messages=messages, temperature=0.0)
            except Exception as e:
                logger.error(f"LLM retry call failed: {e}")
                answer = fallback_phrase
                
            answer, citations, unsupported_sentences, stripped_citations = self._validate_and_build_citations(answer, retrieved_docs, fallback_phrase)
            retried = True

        # Completeness check: every requested part answered (or disclosed as not retrieved) and
        # the structure the question type calls for. At most one retry per question in total,
        # and the rewrite is only kept if it still carries valid citations.
        problems = self._answer_problems(answer, plan) if citations and not retried else []
        if problems:
            logger.info(f"Answer incomplete ({'; '.join(problems)}). Retrying once.")
            retry_prompt = (
                "Rewrite your full answer to fix the following: " + " ".join(problems) + " "
                "Keep every valid [E#] citation next to the claim it supports. For any part the evidence "
                "does not cover, write one line: 'The retrieved sections do not cover <that part>.' "
                "Return only the answer."
            )
            messages.append({"role": "assistant", "content": answer})
            messages.append({"role": "user", "content": retry_prompt})
            try:
                candidate = self.llm.chat_with_messages(messages=messages, temperature=0.0)
                validated = self._validate_and_build_citations(candidate, retrieved_docs, fallback_phrase)
                if validated[1]:
                    answer, citations, unsupported_sentences, stripped_citations = validated
            except Exception as e:
                logger.error(f"LLM completeness retry failed: {e}")
            retried = True

        if not citations:
            answer = fallback_phrase

        # Save assistant message
        try:
            self.db.save_chat_message(session_id=session_id, role="assistant", content=answer)
        except:
            pass

        total_ms = (time.perf_counter() - total_start) * 1000
        logger.info(
            f"Chat timings | rewrite={rewrite_ms:.1f}ms | retrieval={retrieval_ms:.1f}ms "
            f"| llm={llm_ms:.1f}ms | total={total_ms:.1f}ms | rescue_used={rescue_used} | docs={len(retrieved_docs)}"
        )

        confidence = self.evidence_engine.determine_confidence(retrieved_docs) if citations else "low"

        return {
            "answer": answer,
            "citations": citations,
            "closest_matches": [],
            "session_id": session_id,
            "confidence": confidence,
            "validation_metadata": {
                "unsupported_sentences": unsupported_sentences,
                "stripped_citations": stripped_citations,
                "retried": retried
            }
        }

    def _validate_and_build_citations(self, answer: str, retrieved_docs: list[dict], fallback_phrase: str):
        from app.utils.citation_validator import (
            claim_text, extract_normalized_numbers, is_factual_sentence, parse_answer_lines,
            render_answer_lines, soften_absence_claims, strip_internal_sections,
        )
        from app.core.config import settings
        import re

        strict = settings.CITATION_ENFORCEMENT_MODE == "strict"

        # Drop leaked checklist/reasoning sections, and restate "the document does not mention X"
        # as "not retrieved": retrieval never reads the whole document, so absence is unconfirmed.
        answer = strip_internal_sections(answer)
        answer = soften_absence_claims(answer)

        # Normalize bracket variations like 【E1】, 【E1†L1-L2】, [E1:p140], etc. to [E1]
        answer = re.sub(r'【E(\d+)[^】]*】', r'[E\1]', answer)
        answer = re.sub(r'\[E(\d+)[^\]]*\]', r'[E\1]', answer)
        found_numbers = set(re.findall(r'\[E(\d+)\]', answer))
        used_evidence_ids = {f"[E{num}]" for num in found_numbers}

        doc_map = {doc.get("evidence_id"): doc for doc in retrieved_docs if doc.get("evidence_id")}
        valid_evidence_ids = set(doc_map.keys())

        unsupported_sentences = []
        stripped_citations = []

        # 1. Clean up invalid citations that do not exist in the context
        for used_id in used_evidence_ids:
            if used_id not in valid_evidence_ids:
                answer = re.sub(re.escape(used_id), "", answer)
                stripped_citations.append(used_id)

        # 2. Check every claim. The answer is parsed line by line so markdown structure
        # (headings, lists, tables) survives; a table row is checked as one claim.
        lines = parse_answer_lines(answer)
        removed = set()  # (line, unit) claims dropped in strict mode
        pairs_to_score = []
        unit_contexts = []

        for li, line in enumerate(lines):
            for ui, s in enumerate(line.units):
                s_clean = claim_text(s)
                is_claim = len(s_clean.split()) >= 2 if line.kind == "table_row" else is_factual_sentence(s)
                if not is_claim:
                    continue

                valid_cites_in_s = set(re.findall(r'\[E\d+\]', s)).intersection(valid_evidence_ids)
                if not valid_cites_in_s:
                    unsupported_sentences.append(s)
                    if strict:
                        removed.add((li, ui))
                    continue

                # Numbers in the claim must appear in the cited chunks (citation digits excluded)
                nums_in_s = extract_normalized_numbers(s_clean)
                chunk_texts = []
                for cid in valid_cites_in_s:
                    doc = doc_map[cid]
                    text = doc.get("content", "")
                    if doc.get("neighbor_context"):
                        text += " " + doc.get("neighbor_context", "")
                    chunk_texts.append(text)
                nums_in_chunk = extract_normalized_numbers(" ".join(chunk_texts))
                number_supported = nums_in_s.issubset(nums_in_chunk) if nums_in_s else True

                if not number_supported:
                    unsupported_sentences.append(s)
                    if strict:
                        stripped_citations.extend(valid_cites_in_s)
                        removed.add((li, ui))
                        continue

                for cid in valid_cites_in_s:
                    pairs_to_score.append((s_clean, doc_map[cid].get("content", "")))
                    unit_contexts.append(((li, ui), cid))

        if pairs_to_score and self.reranker:
            scores = self.reranker.score_pairs(pairs_to_score)
            support_by_unit = {}
            for (key, cid), score in zip(unit_contexts, scores):
                support_by_unit.setdefault(key, []).append((cid, score))

            for (li, ui), results in support_by_unit.items():
                if max(score for _, score in results) < settings.CITATION_SUPPORT_THRESHOLD:
                    unsupported_sentences.append(lines[li].units[ui])
                    if strict:
                        stripped_citations.extend(cid for cid, _ in results)
                        removed.add((li, ui))

        if strict:
            for li, line in enumerate(lines):
                line.units = [u for ui, u in enumerate(line.units) if (li, ui) not in removed]
        final_answer = render_answer_lines(lines, drop_emptied=strict)

        final_found = set(re.findall(r'\[E(\d+)\]', final_answer))
        final_used = {f"[E{num}]" for num in final_found}
        
        citations = []
        for doc in retrieved_docs:
            cid = doc.get("evidence_id")
            if cid in final_used and cid in valid_evidence_ids:
                citations.append({
                    "evidence_id": cid,
                    "document_id": doc.get("document_id"),
                    "filename": doc.get("filename", ""),
                    "chunk_index": doc.get("chunk_index"),
                    "page_start": doc.get("page_start"),
                    "page_end": doc.get("page_end"),
                    "section_title": doc.get("section_title"),
                    "content": doc.get("content", ""),
                    "rerank_score": doc.get("rerank_score", None),
                })
                
        return final_answer, citations, unsupported_sentences, list(set(stripped_citations))

    def _retrieve_for_parts(self, question: str, plan: AnswerPlan, box_id: str) -> list[dict]:
        """One search for the whole question plus one per requested part, merged round-robin
        so every part keeps its best chunks instead of the strongest part taking every slot."""
        ranked_lists = [
            self.retrieval_engine.retrieve_documents(search_query=query, box_id=box_id)
            for query in [question] + plan.retrieval_queries
        ]
        budget = min(MAX_MULTI_PART_EVIDENCE, max(self.reranker_top_k, EVIDENCE_PER_PART * len(ranked_lists)))
        merged, seen = [], set()
        for rank in range(max(len(ranked) for ranked in ranked_lists)):
            for ranked in ranked_lists:
                if rank >= len(ranked) or len(merged) >= budget:
                    continue
                key = (ranked[rank].get("document_id"), ranked[rank].get("chunk_index"))
                if key not in seen:
                    seen.add(key)
                    merged.append(dict(ranked[rank]))  # copy: ranked lists may come from the shared cache
        return merged

    @staticmethod
    def _answer_problems(answer: str, plan: AnswerPlan) -> list[str]:
        """Requested parts the answer skipped, and missing structure the question type calls for."""
        problems = []
        if plan.is_multi_part:
            missing = [part for part in plan.parts if not part_is_covered(part, answer)]
            if missing:
                problems.append("These requested parts were not addressed: " + "; ".join(f"'{p}'" for p in missing) + ".")

        kinds = [line.kind for line in parse_answer_lines(answer)]
        if plan.question_type == "comparison" and plan.is_multi_part \
                and "table_row" not in kinds and kinds.count("heading") < 2:
            problems.append("Present the comparison as a markdown table with the same criteria for each item.")
        if plan.question_type == "process" and "list" not in kinds \
                and re.search(r"\b(steps?|procedure|process|workflow|stages?)\b", plan.parts[0], re.I):
            problems.append("Present the steps as a numbered list in their logical order.")
        return problems

    def _build_system_prompt(self, context_text: str, fallback_phrase: str, plan: AnswerPlan | None = None) -> str:
        plan = plan or AnswerPlan("factual")
        format_guide = FORMAT_GUIDES.get(plan.question_type, FORMAT_GUIDES["factual"])

        parts_block = ""
        if plan.question_type == "comparison" and plan.parts:
            parts_block = "\nITEMS TO COMPARE (cover each on the same criteria): " + "; ".join(plan.parts) + "\n"
        elif plan.is_multi_part:
            listed = "\n".join(f"{i}. {part}" for i, part in enumerate(plan.parts, 1))
            parts_block = f"\nREQUESTED PARTS (answer every one, in this order):\n{listed}\n"

        return f"""You are DocIntel, an expert Enterprise Knowledge Agent. Answer using ONLY the evidence in CONTEXT.

STRUCTURE:
- {format_guide}
- Answer the question directly and add nothing unrelated. One idea per paragraph; do not repeat information.
- Use headings and tables only when they help; never for a simple factual question.
{parts_block}
EVIDENCE AND CITATIONS:
- CONTEXT is split into blocks such as '--- EVIDENCE [E1] ---'. Every factual sentence, bullet and table row must cite its block, e.g. [E1], right after the claim.
- Never invent evidence IDs, page numbers, quotations or facts. If the user names a file, use only that file's evidence.
- Keep the source's meaning: preserve exceptions, conditions, qualifications, names, dates and who said what. Never turn a qualified statement into an absolute one.
- When several blocks are relevant, combine them into one coherent answer.

MISSING EVIDENCE:
- Answer every part the evidence supports. For a part it does not cover, write: "The retrieved sections do not cover <that part>." Never claim the document as a whole lacks something.
- ONLY IF the CONTEXT has nothing relevant to the question at all, reply with exactly: "{fallback_phrase}"

OUTPUT: Return only the answer in markdown. No checklist, notes or reasoning.

CONTEXT:
{context_text}"""
