"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  CircularProgress, 
  IconButton, 
  InputAdornment, 
  Stack, 
  TextField, 
  Typography, 
  useTheme,
  Divider,
  Chip,
  Switch,
  FormControlLabel,
  Tooltip,
  Skeleton,
  Fade,
  Zoom,
  Slide,
  Grow,
  alpha,
  SxProps,
  Theme,
  useScrollTrigger,
  Fab,
  useMediaQuery,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
// @ts-ignore - Temporary ignore for @react-spring/web
import { useSpring, animated, useSprings } from '@react-spring/web';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Search as SearchIcon, 
  FilterList as FilterListIcon, 
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  MoreVert as MoreVertIcon
} from "@mui/icons-material";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useContactsContext } from "../contacts-context";
import { WppContact } from "@in.pulse-crm/sdk";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

interface ContactsMobileTableProps {
  searchTerm: string;
}

export default function ContactsMobileTable({ searchTerm }: ContactsMobileTableProps) {
  const { 
    contacts = [], 
    isLoading, 
    openContactModal, 
    handleDeleteContact,
    updateContact,
    deleteContact
  } = useContactsContext();
  
  // Estado para o menu de contexto
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    contact: WppContact | null;
  } | null>(null);
  
  const theme = useTheme();
  const router = useRouter();
  
  // Estados locais
  const [showFilters, setShowFilters] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContact, setSelectedContact] = useState<WppContact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Open delete confirmation dialog
  const openDeleteContactModal = (contact: WppContact) => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };
  
  // Handle delete confirmation
  const handleConfirmDelete = async () => {
    if (selectedContact) {
      try {
        await deleteContact(selectedContact.id);
        toast.success('Contato excluído com sucesso!');
      } catch (error) {
        console.error('Erro ao excluir contato:', error);
        toast.error('Erro ao excluir contato');
      } finally {
        setDeleteDialogOpen(false);
        setSelectedContact(null);
      }
    }
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedContact(null);
  };

  // Filtrar contatos
  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    
    const searchLower = searchTerm.toLowerCase();
    return contacts.filter(contact => {
      return (
        (contact.name?.toLowerCase().includes(searchLower)) ||
        (contact.phone?.includes(searchTerm)) ||
        (contact.id?.toString().includes(searchTerm))
      );
    });
  }, [contacts, searchTerm]);
  
  // Animation for the floating action button
  const pulseAnimation = useSpring({
    to: { transform: pulse ? 'scale(1.05)' : 'scale(1)' },
    config: { tension: 300, friction: 10 },
    loop: { reverse: true },
    onRest: () => setPulse(!pulse),
  });

  // Animation for contact cards using a single useSprings hook
  const [cardStyles, api] = useSprings(
    filteredContacts.length,
    index => ({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      delay: 100 + (index * 50),
      config: { tension: 300, friction: 20 }
    }),
    [filteredContacts.length]
  );

  // Update animations when filteredContacts changes
  useEffect(() => {
    api.start(index => ({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
      delay: 100 + (index * 50),
      config: { tension: 300, friction: 20 }
    }));
  }, [filteredContacts, api]);

  // Combine contacts with their animation styles
  const animatedContacts = useMemo(() => {
    return filteredContacts.map((contact, index) => ({
      ...contact,
      animation: cardStyles[index] || {}
    }));
  }, [filteredContacts, cardStyles]);

  // Efeito para fechar o menu quando o componente desmontar
  useEffect(() => {
    return () => {
      handleMenuClose();
    };
  }, []);
  
  // Efeito para scroll
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 100;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };
    
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => document.removeEventListener('scroll', handleScroll);
  }, [scrolled]);
  
  // Start the pulse animation when the component mounts
  useEffect(() => {
    setPulse(true);
  }, []);

  // Funções de manipulação
  const handleContextMenu = (event: React.MouseEvent<HTMLElement>, contact: WppContact) => {
    event.preventDefault();
    setSelectedContact(contact);
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_blank');
    handleMenuClose();
  };

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone}`, '_blank');
    handleMenuClose();
  };
  
  const handleEditContact = (contact: WppContact) => {
    openContactModal(contact);
    handleMenuClose();
  };
  
  const handleDelete = (contact: WppContact) => {
    if (window.confirm(`Tem certeza que deseja excluir o contato ${contact.name}?`)) {
      deleteContact(contact.id);
    }
    handleMenuClose();
  };
  
  // Função para gerar cor baseada no nome do contato
  const getRandomColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 80%)`;
  };

  // Efeito de skeleton loading
  const SkeletonContactCard = () => (
    <Card sx={{ 
      borderRadius: 3,
      mb: 2,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      border: '1px solid',
      borderColor: 'divider',
    }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="60%" height={24} sx={{ mb: 1 }} />
            <Skeleton width="40%" height={20} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rounded" width={80} height={24} />
            <Skeleton variant="rounded" width={70} height={24} />
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Skeleton variant="circular" width={32} height={32} />
            <Skeleton variant="circular" width={32} height={32} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Renderização condicional do loading
  const renderLoading = () => (
    <Box sx={{ p: 2 }}>
      <Skeleton 
        variant="rounded" 
        height={40} 
        sx={{ 
          mb: 2, 
          borderRadius: 2,
          bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.11)' : 'rgba(0, 0, 0, 0.11)'
        }} 
      />
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 4 }} />
        <Skeleton variant="rounded" width={150} height={32} sx={{ borderRadius: 4 }} />
      </Box>
      {[...Array(5)].map((_, index) => (
        <Fade in={true} key={`skeleton-${index}`} timeout={index * 100}>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: 'background.paper',
              boxShadow: 1
            }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Skeleton variant="circular" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" height={24} />
                  <Skeleton width="40%" height={20} sx={{ mt: 1 }} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Fade>
      ))}
    </Box>
  );

  if (isLoading) {
    return renderLoading();
  }

  return (
    <Box>
      {/* Lista de contatos */}
      {filteredContacts.length === 0 ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              py: 8,
              textAlign: 'center',
              color: 'text.secondary'
            }}
          >
            <SearchIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" gutterBottom>
              Nenhum contato encontrado
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, maxWidth: 300 }}>
              {searchTerm 
                ? 'Tente ajustar sua busca ou limpe os filtros.'
                : 'Você ainda não adicionou nenhum contato.'}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => openContactModal()}
              sx={{
                borderRadius: 4,
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                py: 1,
                boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.15)',
                '&:hover': {
                  boxShadow: '0 6px 20px 0 rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              Adicionar primeiro contato
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 1, pb: 8 }}>
            {filteredContacts.map((contact, index) => (
              <animated.div
                key={contact.id}
                style={cardStyles[index]}
                onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => handleContextMenu(e, contact)}
              >
                <Card 
                  sx={{ 
                    mb: 2, 
                    borderRadius: 3,
                    overflow: 'visible',
                    position: 'relative',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme => `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.15)}`,
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                    },
                    '&.MuiCard-root': {
                      overflow: 'visible',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Badge
                        overlap="circular"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar 
                          sx={{ 
                            width: 48, 
                            height: 48, 
                            bgcolor: getRandomColor(contact.name || ''),
                            color: 'white',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            border: `2px solid ${theme.palette.background.paper}`,
                            boxShadow: theme.shadows[2]
                          }}
                          alt={contact.name || 'Contato'}
                        >
                          {contact.name ? contact.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                      </Badge>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography 
                            variant="subtitle1" 
                            noWrap 
                            sx={{ 
                              fontWeight: 600,
                              textDecoration: contact.isBlocked ? 'line-through' : 'none',
                              opacity: contact.isBlocked ? 0.7 : 1
                            }}
                          >
                            {contact.name || 'Sem nome'}
                          </Typography>
                          

                        </Box>
                        
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          noWrap
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 0.5
                          }}
                        >
                          {contact.phone}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                        </Box>
                      </Box>
                      
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContextMenu(e, contact);
                        }}
                        sx={{
                          alignSelf: 'flex-start',
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: theme => alpha(theme.palette.primary.main, 0.1)
                          }
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </animated.div>
            ))}
          </Box>
        )}
        
        {/* Botão flutuante para adicionar contato */}
        <Box sx={{ position: 'fixed', bottom: 24, right: 16, zIndex: 1000 }}>
          <Fab
            color="primary"
            aria-label="adicionar contato"
            onClick={() => openContactModal()}
            sx={{
              boxShadow: theme.shadows[8],
              transform: scrolled ? 'scale(1)' : 'scale(1.05)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: scrolled ? 'scale(1.05)' : 'scale(1.1)',
                boxShadow: theme.shadows[12],
                backgroundColor: theme.palette.primary.dark,
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
            }}
          >
            <AddIcon sx={{ fontSize: 28 }} />
            {pulse && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  border: `2px solid ${theme.palette.primary.main}`,
                  opacity: 0,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': {
                    '0%': {
                      transform: 'scale(0.8)',
                      opacity: 0.7,
                    },
                    '70%': {
                      transform: 'scale(1.3)',
                      opacity: 0,
                    },
                    '100%': {
                      opacity: 0,
                    },
                  },
                }}
              />
            )}
          </Fab>
        </Box>

      {/* Contact Menu */}
      <Menu
        id="contact-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          elevation: 4,
          sx: {
            borderRadius: 2,
            minWidth: 200,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            '& .MuiMenuItem-root': {
              padding: '8px 16px',
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
              '& .MuiSvgIcon-root': {
                color: theme.palette.text.secondary,
                marginRight: 12,
                fontSize: 20,
              },
            },
          },
        }}
      >
        <MenuItem 
          onClick={() => {
            if (selectedContact) {
              openContactModal(selectedContact);
            }
            handleMenuClose();
          }}
          sx={{ 
            py: '4px !important',
            '& .MuiBox-root': {
              display: 'flex !important',
              alignItems: 'center !important',
              gap: '4px !important',
              width: '100% !important',
              '& svg': {
                minWidth: '20px !important',
                marginRight: '4px !important',
                fontSize: '20px !important',
                flexShrink: 0,
              },
              '& span': {
                fontSize: '0.875rem !important',
                lineHeight: '1.5 !important',
              }
            }
          }}
        >
          <Box>
            <EditIcon />
            <span>Editar contato</span>
          </Box>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (selectedContact) {
              openDeleteContactModal(selectedContact);
            }
            handleMenuClose();
          }}
          sx={{
            py: '4px !important',
            color: theme.palette.error.main + ' !important',
            '&:hover': {
              backgroundColor: theme.palette.error.light + '20 !important',
            },
            '& .MuiBox-root': {
              display: 'flex !important',
              alignItems: 'center !important',
              gap: '4px !important',
              width: '100% !important',
              '& svg': {
                minWidth: '20px !important',
                marginRight: '4px !important',
                fontSize: '20px !important',
                flexShrink: 0,
                color: 'inherit !important',
              },
              '& span': {
                fontSize: '0.875rem !important',
                lineHeight: '1.5 !important',
                color: 'inherit !important',
              }
            }
          }}
        >
          <Box>
            <DeleteIcon />
            <span>Excluir contato</span>
          </Box>
        </MenuItem>
      </Menu>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmar exclusão
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja excluir o contato {selectedContact?.name || ''}? 
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            color="error"
            variant="contained"
            autoFocus
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
