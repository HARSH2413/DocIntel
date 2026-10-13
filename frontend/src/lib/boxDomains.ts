import {
  Factory, Folder, Megaphone, Scale, ShieldCheck, TrendingUp, Users, Wallet, Wrench, type LucideIcon,
} from 'lucide-react';

// Exactly the categories the API accepts (BoxCreate.domain in backend/app/api/boxes.py).
// Offering more options than the backend stores made most choices silently become "general".
export const BOX_DOMAINS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'general', label: 'General', icon: Folder },
  { value: 'finance', label: 'Finance', icon: Wallet },
  { value: 'legal', label: 'Legal', icon: Scale },
  { value: 'compliance', label: 'Compliance', icon: ShieldCheck },
  { value: 'human_resources', label: 'Human resources', icon: Users },
  { value: 'engineering', label: 'Engineering', icon: Wrench },
  { value: 'sales', label: 'Sales', icon: TrendingUp },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'operations', label: 'Operations', icon: Factory },
];

export function domainInfo(value?: string | null) {
  return BOX_DOMAINS.find(d => d.value === value) ?? null;
}
