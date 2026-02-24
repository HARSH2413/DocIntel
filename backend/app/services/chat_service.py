from app.interfaces.vector_store import IVectorStore
from app.interfaces.embedder import IEmbedder
from app.interfaces.llm import ILLM

class ChatService:
    def __init__(self, db: IVectorStore, embedder: IEmbedder, llm: ILLM):
        self.db = db
        self.embedder = embedder
        self.llm = llm

    def ask_question(self, question: str, tenant_id: str) -> dict:
        """Returns the AI answer AND the exact source paragraphs."""
        
        # 1. Embed the question
        query_vector = self.embedder.embed_text([question])[0]

        # 2. Retrieve the chunks
        retrieved_docs = self.db.search_similar(
            query_vector=query_vector, 
            tenant_id=tenant_id, 
            limit=5
        )

        # 3. Handle Empty Results
        if not retrieved_docs:
            return {
                "answer": "No relevant company documents were found to answer this question.",
                "citations": []
            }

        # 4. Build Context
        context_text = "\n\n---\n\n".join(
            [f"Document: {doc['filename']}\nContent: {doc['content']}" for doc in retrieved_docs]
        )

        # 5. The Smarter Enterprise Prompt
        system_prompt = f"""
        You are ActionRAG, an expert Enterprise Knowledge Agent. 
        Your task is to answer the user's question using ONLY the facts provided in the CONTEXT below.
        You are allowed to synthesize, rephrase, and connect the information in the context to provide a complete answer.
        If the CONTEXT does not contain enough relevant information to answer the question, you must reply with exactly: "This information is not present in the current company documents."
        Under no circumstances should you use outside knowledge or make assumptions.

        CRITICAL FORMATTING RULE:
        You must output your response in pure, unformatted plain text ONLY. 
        DO NOT use any markdown formatting, asterisks (**), bolding, hashes (###), dashes (-), or equals signs (===). 
        Write your answers in clean, standard paragraphs.

        CONTEXT:
        {context_text}
        """

        # 6. Generate Answer
        answer = self.llm.generate_response(system_prompt=system_prompt, user_prompt=question)

        # 🛡️ THE BULLETPROOF MARKDOWN STRIPPER
        # This physically rips out the markdown characters before your frontend sees them.
        answer = answer.replace("**", "").replace("*", "").replace("###", "").replace("===", "")

        # 7. Package the Citations for the Split-Screen UI
        citations = [
            {
                "filename": doc["filename"],
                "content": doc["content"],
                "similarity": doc.get("similarity", 0.0) # Pulled straight from pgvector math
            }
            for doc in retrieved_docs
        ]

        # 7. Package the Citations for the Split-Screen UI
        citations = [
            {
                "filename": doc["filename"],
                "content": doc["content"],
                "similarity": doc.get("similarity", 0.0) # Pulled straight from pgvector math
            }
            for doc in retrieved_docs
        ]

        # 8. Return the Structured Data
        return {
            "answer": answer,
            "citations": citations
        }
    
    def ask_question(self, question: str, tenant_id: str, session_id: str) -> dict:
        # 1. Save user question
        self.db.save_chat_message(session_id=session_id, role="user", content=question)

        # 2. Fetch history
        chat_history = self.db.get_chat_history(session_id=session_id)

        # 3. Vector Search
        query_vector = self.embedder.embed_text([question])[0]
        retrieved_docs = self.db.search_similar(query_vector=query_vector, tenant_id=tenant_id, limit=5)
        
        context_text = "\n\n".join([doc["content"] for doc in retrieved_docs])
        
        # 🛡️ THE DEFINED FALLBACK PHRASE
        fallback_phrase = "I could not find the answer to this in the provided company documents."

        # 4. 🎨 THE UPGRADED PROMPT (Formatting & Improvisation)
        system_prompt = f"""
        You are ActionRAG, an expert Enterprise Knowledge Agent.
        
        INSTRUCTIONS:
        1. FACTUAL ACCURACY: Answer the user's question using ONLY the facts provided in the CONTEXT below.
        2. FORMATTING: You must format your response beautifully using Markdown. Use **bolding** for emphasis, bullet points for lists, and tables where data comparison is needed.
        3. ADAPTABILITY: If the user asks for a specific format (e.g., "write an email", "explain like I'm 5", "give me a table"), you MUST follow their formatting request strictly, but still only use facts from the CONTEXT.
        4. THE SHIELD: If the CONTEXT does not contain enough relevant information to confidently answer the question, you must reply with EXACTLY this phrase and absolutely nothing else: "{fallback_phrase}"

        CONTEXT:
        {context_text}
        """

        messages = [{"role": "system", "content": system_prompt}]
        
        # 🔄 Inject ONLY THE LAST 6 MESSAGES to save tokens and prevent crashes
        for msg in chat_history[-6:]: 
            messages.append({"role": msg["role"], "content": msg["content"]})

        # 5. Call Groq
        chat_completion = self.llm.client.chat.completions.create(
            messages=messages,
            model=self.llm.model_name,
            temperature=0.1 # Slight bump from 0.0 to 0.1 to allow for better formatting creativity
        )
        
        answer = chat_completion.choices[0].message.content

        # 6. Save AI answer
        self.db.save_chat_message(session_id=session_id, role="assistant", content=answer)

        # 7. 🛑 THE CITATION SHIELD
        citations = []
        if fallback_phrase not in answer:
            # Only build citations if the AI actually found the answer!
            for doc in retrieved_docs:
                clean_preview = doc["content"].replace("\n", " ")[:150].strip() + "..."
                citations.append({
                    "filename": doc["filename"],
                    "preview": clean_preview,
                    "full_context": doc["content"],
                    "similarity": doc.get("similarity", 0.0)
                })

        return {
            "answer": answer,
            "citations": citations, # This will automatically be empty [] if it didn't know the answer!
            "session_id": session_id
        }