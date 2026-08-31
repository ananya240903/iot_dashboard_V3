import { useState } from 'react';

export function useChunkedPagination(initialRowsPerPage = 25) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    const resetPagination = () => {
        setCurrentPage(1);
        setHasMoreData(true);
    };

    const getPaginatedData = (data) => {
        if (rowsPerPage === 'All') return data;
        return data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    };

    const getTotalPages = (dataLength) => {
        if (rowsPerPage === 'All') return 1;
        return Math.ceil(dataLength / rowsPerPage) || 1;
    };

    return {
        currentPage,
        setCurrentPage,
        rowsPerPage,
        setRowsPerPage,
        hasMoreData,
        setHasMoreData,
        isLoadingMore,
        setIsLoadingMore,
        resetPagination,
        getPaginatedData,
        getTotalPages
    };
}
