"use client";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  WhatsappClient,
  AutomaticResponseRule,
  AutomaticResponseRuleDTO,
  User
} from "@in.pulse-crm/sdk";
import { useAuthContext } from "@/app/auth-context";
import { Logger } from "@in.pulse-crm/utils";
import { toast } from "react-toastify";
import { WPP_BASE_URL } from "../../whatsapp-context";
import RuleModal from "./rule-modal";
import DeleteRuleModal from "./delete-rule-modal";

interface IAutoResponseContext {
  rules: AutomaticResponseRule[];
  users: User[];
  isLoading: boolean;
  modal: ReactNode;
  loadRules: () => void;
  openRuleModal: (rule?: AutomaticResponseRule) => void;
  closeModal: () => void;
  createRule: (data: AutomaticResponseRuleDTO) => Promise<void>;
  updateRule: (id: number, data: Omit<AutomaticResponseRuleDTO, 'instance'>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  handleDeleteRule: (rule: AutomaticResponseRule) => void;
}

const AutoResponseContext = createContext<IAutoResponseContext>({} as IAutoResponseContext);
export const useAutoResponseContext = () => useContext(AutoResponseContext);

export default function AutoResponseProvider({ children }: { children: ReactNode }) {
  const api = useRef(new WhatsappClient(WPP_BASE_URL));
  const { token } = useAuthContext();

  const [rules, setRules] = useState<AutomaticResponseRule[]>([]);
  const [users] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modal, setModal] = useState<ReactNode>(null);

  const loadRules = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await api.current.getAutoResponseRules();
      setRules(res);
    } catch (err) {
      Logger.error("Error loading auto response rules", err as Error);
      toast.error("Falha ao carregar as regras.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const closeModal = useCallback(() => setModal(null), []);

  const createRule = useCallback(async (data: AutomaticResponseRuleDTO) => {
    try {
      await api.current.createAutoResponseRule(data as any);
      toast.success("Regra criada com sucesso!");
      closeModal();
      await loadRules();
    } catch (err) {
      Logger.error("Error creating rule", err as Error);
      toast.error("Falha ao criar a regra.");
    }
  }, [loadRules, closeModal]);

  const updateRule = useCallback(async (id: number, data: Omit<AutomaticResponseRuleDTO, 'instance'>) => {
    try {
      await api.current.updateAutoResponseRule(id, data as any);
      toast.success("Regra atualizada com sucesso!");
      closeModal();
      await loadRules();
    } catch (err) {
      Logger.error("Error updating rule", err as Error);
      toast.error("Falha ao atualizar a regra.");
    }
  }, [loadRules, closeModal]);

  const deleteRule = useCallback(async (id: number) => {
    try {
      await api.current.deleteAutoResponseRule(id);
      toast.success("Regra excluída com sucesso!");
      closeModal();
      setRules(prev => prev.filter(rule => rule.id !== id));
    } catch (err) {
      Logger.error("Error deleting rule", err as Error);
      toast.error("Falha ao excluir a regra.");
    }
  }, [closeModal]);

  const openRuleModal = useCallback((rule?: AutomaticResponseRule) => {
    setModal(<RuleModal rule={rule} />);
  }, []);

  const handleDeleteRule = useCallback((rule: AutomaticResponseRule) => {
    setModal(<DeleteRuleModal rule={rule} />);
  }, []);

  useEffect(() => {
    if (token) {
      api.current.setAuth(token);
      loadRules();
    }
  }, [token, loadRules]);

  return (
    <AutoResponseContext.Provider
      value={{
        rules,
        users,
        isLoading,
        modal,
        loadRules,
        openRuleModal,
        closeModal,
        createRule,
        updateRule,
        deleteRule,
        handleDeleteRule,
      }}
    >
      {children}
      {modal}
    </AutoResponseContext.Provider>
  );
}
