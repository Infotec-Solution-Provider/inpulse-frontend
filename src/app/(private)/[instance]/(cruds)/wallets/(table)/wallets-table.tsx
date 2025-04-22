"use client";
import { Button, Table, TableBody, TableContainer, TableHead, TablePagination, TableSortLabel } from "@mui/material";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useContext, useEffect, useMemo, useState } from "react";
import { WalletsContext } from "../context";
import WalletTableRow from "./wallet-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";

export default function WalletsTable() {
    const { wallets, loading, order, orderBy, handleSort, sortedWallets } = useContext(WalletsContext);
    const [page, setPage] = useState<number>(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => setPage(0), [wallets]);

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };
    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const rows = useMemo(() => {
        if (!loading && sortedWallets.length > 0) {
            return (
                <TableBody>
                    {sortedWallets.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((wallet, index) => (
                        <WalletTableRow
                            key={`${wallet.name}_${wallet.id}`}
                            wallet={wallet}
                            index={index + page * 10}
                        />
                    ))}
                </TableBody>
            );
        } else if (loading) {
            return (
                <TableBody>
                    <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
                        <StyledTableCell colSpan={8} className="flex items-center justify-center gap-2">
                            <HourglassBottomIcon /> Carregando carteiras...
                        </StyledTableCell>
                    </StyledTableRow>
                </TableBody>
            );
        } else {
            return (
                <TableBody>
                    <StyledTableRow className="h-32 w-full items-center justify-center text-center text-gray-400">
                        <StyledTableCell colSpan={8}>
                            Nenhuma carteira encontrada
                        </StyledTableCell>
                    </StyledTableRow>
                </TableBody>
            );
        }
    }, [page, rowsPerPage, loading]);

    return (
        <div className="relative flex flex-col h-[calc(100vh-100px)]">
            <TableContainer className="mx-auto w-full bg-indigo-700 bg-opacity-5 shadow-md flex-1">
                <Table>
                    <TableHead>
                        <StyledTableRow className="sticky top-0 rounded-md bg-indigo-900">
                            <StyledTableCell sx={{ width: '70px' }} sortDirection={orderBy === 'id' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'id'}
                                    direction={orderBy === 'id' ? order : 'asc'}
                                    onClick={() => handleSort('id')}
                                >
                                    ID
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell sx={{ width: '350px' }} sortDirection={orderBy === 'name' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleSort('name')}
                                >
                                    Nome
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell sx={{ width: '150px' }} sortDirection={orderBy === 'instanceName' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'instanceName'}
                                    direction={orderBy === 'instanceName' ? order : 'asc'}
                                    onClick={() => handleSort('instanceName')}
                                >
                                    Instancia
                                </TableSortLabel>
                            </StyledTableCell>
                        </StyledTableRow>
                    </TableHead>
                    {rows}
                </Table>
            </TableContainer>
            <div className="flex gap-4 sticky bottom-0 self-center pt-4 pb-2">
                <Button variant="outlined">
                    Cadastrar carteira
                </Button>
                <TablePagination
                    component="div"
                    count={wallets.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[10, 25, 50]}
                    labelDisplayedRows={({ from, to, count }) =>
                        `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                    }
                    labelRowsPerPage="Carteiras por página:"
                />
            </div>
        </div>
    );
}