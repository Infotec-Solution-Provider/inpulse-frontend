"use client"
import { useEffect, useState } from "react";
import ContactsTable from "./(table)/table";
import { useMediaQuery, useTheme, TextField, InputAdornment } from "@mui/material";
import ContactsMobileTable from "./(table)/mobile-table";
import SearchIcon from '@mui/icons-material/Search';

export default function ContactsManagementPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Evitar hidratação desnecessária no servidor
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-white dark:bg-gray-900">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-2 md:px-4 lg:px-6 xl:px-10 pt-2 md:pt-3 lg:pt-4 xl:pt-5 w-full min-h-screen box-border relative bg-white text-black dark:bg-gray-900 dark:text-white">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 px-2 md:px-0">
        <h1 className="text-xl md:text-2xl font-bold">Gerenciamento de Contatos</h1>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Pesquisar contatos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 250,
            '& .MuiOutlinedInput-root': {
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
              '&:hover': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
              },
            },
          }}
        />
      </div>
      {isMobile ? (
        <div className="w-full">
          <ContactsMobileTable searchTerm={searchTerm} />
        </div>
      ) : (
        <ContactsTable searchTerm={searchTerm} />
      )}
    </div>
  );
}
