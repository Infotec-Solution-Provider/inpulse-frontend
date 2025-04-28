"use client";
import { Table, TableBody, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel } from "@mui/material";
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useContext, useEffect, useMemo, useState } from "react";
import { WalletsContext } from "../context";
import WalletTableRow from "./wallet-row";
import { StyledTableCell, StyledTableRow } from "./styles-table";
import CreateWalletModal from "../(modal)/wallet-create-modal";

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
                    <TableRow>
                        <StyledTableCell colSpan={4}>
                            <div className="flex justify-center w-full">
                                <div className="flex">
                                    <HourglassBottomIcon className="animate-spin" />
                                    <p className="flex w-full px-2 items-center align-middle justify-center"> Carregando carteiras</p>
                                </div>
                            </div>
                        </StyledTableCell>
                    </TableRow>
                </TableBody>
            );
        } else {
            return (
                <TableBody>
                    <TableRow>
                        <StyledTableCell colSpan={4}>
                            <div className="flex justify-center w-full">
                                <div className="flex">
                                    <p className="flex w-full px-2 items-center align-middle justify-center">Nenhuma carteira encontrada</p>
                                </div>
                            </div>
                        </StyledTableCell>
                    </TableRow>
                </TableBody>
            );
        }
    }, [sortedWallets, page, rowsPerPage, loading]);

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
                                    sx={{ display: 'flex', justifyContent: 'center', paddingLeft: '25px' }}
                                >
                                    ID
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell sx={{ width: '250px' }} sortDirection={orderBy === 'name' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'name'}
                                    direction={orderBy === 'name' ? order : 'asc'}
                                    onClick={() => handleSort('name')}
                                    sx={{ display: 'flex', justifyContent: 'center', paddingLeft: '25px' }}
                                >
                                    Nome
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell sortDirection={orderBy === 'userIds' ? order : false}>
                                <TableSortLabel
                                    active={orderBy === 'userIds'}
                                    direction={orderBy === 'userIds' ? order : 'asc'}
                                    onClick={() => handleSort('userIds')}
                                    sx={{ display: 'flex', justifyContent: 'center', paddingLeft: '25px' }}
                                >
                                    Número de integrantes
                                </TableSortLabel>
                            </StyledTableCell>
                            <StyledTableCell sx={{ textAlign: 'center' }} >
                                Ações
                            </StyledTableCell>
                        </StyledTableRow>
                    </TableHead>
                    {rows}
                </Table>
            </TableContainer>
            <div className="flex gap-4 sticky bottom-0 self-center pt-4 pb-2">
                <CreateWalletModal />
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