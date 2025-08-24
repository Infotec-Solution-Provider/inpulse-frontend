import { Avatar, Box, Button, CircularProgress, Typography } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { WppContact } from "@in.pulse-crm/sdk";
import { useContext, useMemo, useState } from "react";
import ContactModal from "@/lib/components/contact-modal-detail";
import { AuthContext } from "@/app/auth-context";
import { useContactsContext } from "../../(cruds)/contacts/contacts-context";

interface VCardMessageProps {
    vCardString: string;
}

export default function VCardMessage({ vCardString }: VCardMessageProps) {
    const { instance } = useContext(AuthContext);
    const {contacts} = useContactsContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [contactForModal, setContactForModal] = useState<WppContact | null>(null);
    const [isLoadingModal, setIsLoadingModal] = useState(false);

    const { name, phone } = useMemo(() => {
        const lines = vCardString.split('\n');
        const vCardPhone = lines[2]?.trim() || '';
        const vCardName = lines[1]?.trim() || vCardPhone;
        return { name: vCardName, phone: vCardPhone };
    }, [vCardString]);

    const handleViewContact = async () => {
      setIsLoadingModal(true);
      setIsModalOpen(true);
      try {
        console.log(contacts)
        let contactToShow = contacts.find(c => c.phone === phone.replace(/\D/g, ""));
        let contactW: WppContact =
        {
            id: contactToShow? contactToShow.id : 0,
            name:contactToShow?contactToShow.name:name,
            phone:contactToShow?contactToShow.phone:phone,
            instance: instance || "",
            isBlocked: false,
            isOnlyAdmin: false,
          };


        setContactForModal(contactW);
      } catch (error) {
        console.error("Erro ao buscar contatos:", error);
        setIsModalOpen(false);
      } finally {
        setIsLoadingModal(false);
      }
    };

    return (
        <>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    backgroundColor: 'background.default',
                    maxWidth: 350,
                }}
            >
                <Avatar sx={{ width: 48, height: 48 }}>
                    <PersonIcon />
                </Avatar>
                <Typography variant="body1" sx={{ fontWeight: 'medium', flexGrow: 1 }}>
                    {name}
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handleViewContact}
                >
                    Ver Contato
                </Button>
            </Box>

            <ContactModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                contact={contactForModal}
                chat={null}
                isLoading={isLoadingModal}
            />
        </>
    );
}
