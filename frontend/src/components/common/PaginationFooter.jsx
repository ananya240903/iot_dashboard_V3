import React from 'react';

export default function PaginationFooter({
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalItems,
    totalPages,
    hasMoreData,
    isLoadingMore,
    onLoadMore,
}) {
    return (
        <div className="flex items-center justify-between px-6 py-5 border-t border-slate-200/60 mt-auto bg-slate-50/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-800">{rowsPerPage === 'All' ? (totalItems === 0 ? 0 : 1) : (currentPage - 1) * rowsPerPage + 1}</span> to <span className="font-bold text-slate-800">{rowsPerPage === 'All' ? totalItems : Math.min(currentPage * rowsPerPage, totalItems)}</span> of <span className="font-bold text-slate-800">{totalItems}{hasMoreData ? '+' : ''}</span> results
                </span>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                    <label className="text-sm font-medium text-slate-500">Rows per page:</label>
                    <select
                        value={rowsPerPage}
                        onChange={(e) => {
                            setRowsPerPage(e.target.value === 'All' ? 'All' : Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="bg-transparent text-sm font-bold text-slate-700 rounded-md outline-none cursor-pointer p-1"
                    >
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                    </select>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-5 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 bg-white/80 hover:bg-slate-50 hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    Previous
                </button>
                <button
                    onClick={() => {
                        if (currentPage === totalPages && hasMoreData && onLoadMore) {
                            onLoadMore().then(() => setCurrentPage(p => p + 1));
                        } else {
                            setCurrentPage(p => Math.min(totalPages, p + 1));
                        }
                    }}
                    disabled={(currentPage === totalPages && !hasMoreData) || isLoadingMore}
                    className="px-5 py-2.5 text-sm font-bold rounded-xl border border-slate-200 text-slate-700 bg-white/80 hover:bg-slate-50 hover:shadow-sm disabled:opacity-40 disabled:hover:shadow-none disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                >
                    {isLoadingMore ? 'Loading...' : 'Next'}
                </button>
            </div>
        </div>
    );
}
