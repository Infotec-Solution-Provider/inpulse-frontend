import Chat from "./(chat)/chat";
import ChatsMenu from "./(chats-menu)/chats-menu";

export default function Home() {
    return (
        <div className="py-4 px-4 box-border grid grid-cols-[24rem_1fr] grid-rows-1 gap-4">
            <ChatsMenu />
            <Chat
                name="John Doe"
                company="Example Company"
                phone="1234567890"
                cnpj="12345678901234"
                id={1}
                erpId="ERP123"
                startDate="2023-01-01"
                urgency="NORMAL"
                allowedUrgency={["NORMAL", "ALTA", "URGENTE"]}
                avatarUrl="https://via.placeholder.com/64"
            />
        </div>
    );
}