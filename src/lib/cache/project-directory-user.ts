import { User } from "@/lib/sdk-local";

export default function projectDirectoryUser(user: User): User {
  return {
    CODIGO: user.CODIGO,
    ATIVO: user.ATIVO,
    NOME: user.NOME,
    LOGIN: user.LOGIN,
    WHATSAPP: user.WHATSAPP,
    NIVEL: user.NIVEL,
    SETOR: user.SETOR,
    SETOR_NOME: user.SETOR_NOME,
    NOME_EXIBICAO: user.NOME_EXIBICAO,
    AVATAR_ID: user.AVATAR_ID,
  } as User;
}
