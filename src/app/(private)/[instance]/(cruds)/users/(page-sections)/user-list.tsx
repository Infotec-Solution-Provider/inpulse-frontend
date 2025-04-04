import { useContext } from "react";
import { UsersContext } from "../context";


export default function UserList() {
    const { users } = useContext(UsersContext);

    const handleEditClick = (user: any) => {
    };

    return (
        <div className="w-full">
            <div className="bg-gray-500 rounded-lg p-6">
                <div className="w-full">
                    <div className="grid grid-cols-[auto,repeat(6,1fr)] p-2 font-bold border-b-2 border-white">
                        <div className="w-24"></div>
                        <div>ID</div>
                        <div>Ativo</div>
                        <div>Nível</div>
                        <div>Nome</div>
                        <div>Login</div>
                        <div>Setor</div>
                    </div>
                    {users.map((user, index) => (
                        <div key={index} className="grid grid-cols-[auto,repeat(6,1fr)] p-2 border-b border-gray-300 items-center">
                            <div className="w-24">
                                <button
                                    onClick={() => handleEditClick(user)}
                                    className="bg-blue-500 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded"
                                >
                                    Editar
                                </button>
                            </div>
                            <div>{user.CODIGO}</div>
                            <div>{user.ATIVO}</div>
                            <div>{user.NIVEL}</div>
                            <div>{user.NOME}</div>
                            <div>{user.LOGIN}</div>
                            <div>{user.SETOR}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}