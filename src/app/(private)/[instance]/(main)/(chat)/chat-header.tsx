import { useRouter } from "next/navigation";
import { useState, useContext } from "react";
import {
  Avatar,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EditIcon from "@mui/icons-material/Edit";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SyncAltIcon from "@mui/icons-material/SyncAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonIcon from "@mui/icons-material/Person";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import { Formatter } from "@in.pulse-crm/utils";
import { AppContext } from "../../app-context";
import { useWhatsappContext } from "../../whatsapp-context";
import EditContactModal from "./(actions)/edit-contact-modal";
import FinishChatModal from "./(actions)/finish-chat-modal";
import ScheduleChatModal from "./(actions)/schedule-chat-modal";
import TransferChatModal from "./(actions)/transfer-chat-modal";
import DeleteChatModal from "./(actions)/delete-internal-chat-modal";

export interface ChatContactInfoProps {
  name: string;
  customerName: string;
  phone: string;
  avatarUrl?: string | null;
  chatType?: string | null;
}

export default function ChatHeader({
  name,
  avatarUrl,
  customerName,
  phone,
  chatType,
}: ChatContactInfoProps) {
  const router = useRouter();
  const { openModal } = useContext(AppContext);
  const { currentChat } = useWhatsappContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const openFinishChatModal = () => {
    openModal(<FinishChatModal />);
    handleClose();
  };

  const openDeleteChatModal = () => {
    openModal(<DeleteChatModal />);
    handleClose();
  };

  const openTransferChatModal = () => {
    openModal(<TransferChatModal />);
    handleClose();
  };

  const openScheduleChatModal = () => {
    openModal(<ScheduleChatModal />);
    handleClose();
  };

  const openEditContactModal = () => {
    openModal(<EditContactModal />);
    handleClose();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b bg-slate-200 px-4 py-3 dark:border-none dark:dark:bg-slate-800">
      <div className="flex items-center gap-3 md:mt-0 mt-6">
        <IconButton 
          onClick={handleBack}
          className="text-slate-700 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50"
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Avatar
          variant="circular"
          alt={name}
          src={avatarUrl || ""}
          className="h-12 w-12 border-2 border-white shadow-sm"
        />
        
        <div className="ml-1">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
            {name}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {chatType === "wpp" ? Formatter.phone(phone) : customerName}
          </p>
        </div>
      </div>

      <div className="flex items-center">
        <div className="h-2" />
        <IconButton
          onClick={handleMenu}
          className="text-slate-700 dark:text-slate-200 hover:bg-slate-300/50 dark:hover:bg-slate-700/50"
          style={{ marginTop: 16 }}
          aria-label="menu"
          aria-controls="chat-menu"
          aria-haspopup="true"
        >
          <MoreVertIcon />
        </IconButton>

        <Menu
          id="chat-menu"
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          MenuListProps={{
            'aria-labelledby': 'chat-menu-button',
          }}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          PaperProps={{
            className: 'mt-2 min-w-[200px]',
            elevation: 2,
          }}
        >
          {currentChat?.chatType === "wpp" ? (
            [
              <MenuItem key="edit" onClick={openEditContactModal}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText>Editar contato</ListItemText>
              </MenuItem>,
              
              <MenuItem key="transfer" onClick={openTransferChatModal}>
                <ListItemIcon>
                  <SyncAltIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText>Transferir conversa</ListItemText>
              </MenuItem>,
              
              <MenuItem key="schedule" onClick={openScheduleChatModal}>
                <ListItemIcon>
                  <ScheduleIcon fontSize="small" color="warning" />
                </ListItemIcon>
                <ListItemText>Agendar retorno</ListItemText>
              </MenuItem>,
              
              <Divider key="divider" className="my-1" />,
              
              <MenuItem key="finish" onClick={openFinishChatModal}>
                <ListItemIcon>
                  <ExitToAppIcon fontSize="small" color="success" />
                </ListItemIcon>
                <ListItemText>Finalizar conversa</ListItemText>
              </MenuItem>
            ]
          ) : currentChat?.chatType === "internal" && !currentChat.isGroup ? (
            <MenuItem key="delete" onClick={openDeleteChatModal}>
              <ListItemIcon>
                <AssignmentTurnedInIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Deletar conversa</ListItemText>
            </MenuItem>
          ) : null}
        </Menu>
      </div>
    </div>
  );
}
