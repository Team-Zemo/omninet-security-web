import { useState, useRef, useEffect } from 'react';
import { categoryAPI, notesAPI } from '../../services/api';
import AddNoteModal from '../../components/Notes/AddNoteModal';
import NoteDetailModal from '../../components/Notes/NoteDetailModal';
import CategoryDropdown from '../../components/Notes/CategoryDropdown';
import FloatingActionButton from '../../components/Notes/FloatingActionButton';
import NotesGrid from '../../components/Notes/NotesGrid';
import toast, { Toaster } from 'react-hot-toast';

function Notes() {
    const [categories, setCategories] = useState([]);
    const [notes, setNotes] = useState([]);
    const [pagination, setPagination] = useState({
        pageNo: 0,
        pageSize: 20,
        totalNotesCount: 0,
        totalPagesCount: 0,
        first: true,
        last: true
    });
    const [loading, setLoading] = useState(false);
    const [notesLoading, setNotesLoading] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All categories');
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isPageSizeDropdownOpen, setIsPageSizeDropdownOpen] = useState(false);
    const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentView, setCurrentView] = useState('notes'); // 'notes', 'recycled', 'deleted'
    const [selectedNote, setSelectedNote] = useState(null);
    const [isNoteDetailModalOpen, setIsNoteDetailModalOpen] = useState(false);
    const pageSizeDropdownRef = useRef(null);


    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const selectCategory = (category) => {
        setSelectedCategory(category);
        setIsDropdownOpen(false);
        // Reset to first page and apply filter
        fetchAndFilterNotes(category, 0, pagination.pageSize);
    };

    const toggleFab = () => {
        setIsFabOpen(!isFabOpen);
    };

    const handleAddNote = () => {
        setIsAddNoteModalOpen(true);
        setIsFabOpen(false);
    };

    const handleRecycleBin = async () => {
        try {
            setNotesLoading(true);
            setCurrentView('recycled');
            const response = await notesAPI.getRecycledNotes();
            
            if (response.status === 'success') {
                // Handle different possible data structures
                let recycledNotes = response.data;
                

                // Calculate pagination for recycled notes
                const totalNotesCount = recycledNotes.length;
                const totalPagesCount = Math.ceil(totalNotesCount / pagination.pageSize);
                const startIndex = 0 * pagination.pageSize;
                const endIndex = startIndex + pagination.pageSize;
                const paginatedNotes = recycledNotes.slice(startIndex, endIndex);

                setNotes(paginatedNotes);
                setPagination({
                    pageNo: 0,
                    pageSize: pagination.pageSize,
                    totalNotesCount: totalNotesCount,
                    totalPagesCount: totalPagesCount,
                    first: true,
                    last: totalPagesCount <= 1
                });
            }
        } catch (error) {
            console.error('Error fetching recycled notes:', error);
            setNotes([]);
            setPagination({
                pageNo: 0,
                pageSize: pagination.pageSize,
                totalNotesCount: 0,
                totalPagesCount: 0,
                first: true,
                last: true
            });
        } finally {
            setNotesLoading(false);
            setIsFabOpen(false);
        }
    };

    const handleDeleteRecycled = async () => {
        try {
            const response = await notesAPI.emptyRecycleBin();
            handleRecycleBin();
            if(response.status === 'success') {
                toast.success('Recycle bin emptied successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });
            }
        } catch (error) {
            console.error('Error emptying recycle bin:', error);
        }
        console.log('Show deleted notes');
        setIsFabOpen(false);
    };

    const handleShowAllNotes = () => {
        setSelectedCategory('All categories');
        setCurrentView('notes');
        fetchAndFilterNotes('All categories', 0, pagination.pageSize);
        setIsFabOpen(false);
    };

    const handlePageSizeChange = (newPageSize) => {
        setIsPageSizeDropdownOpen(false);
        fetchAndFilterNotes(selectedCategory, 0, newPageSize);
    };

    const togglePageSizeDropdown = () => {
        setIsPageSizeDropdownOpen(!isPageSizeDropdownOpen);
    };

    const handleCloseModal = () => {
        setIsAddNoteModalOpen(false);
    };

    const handleSubmitNote = async (noteData) => {
        if (!noteData.title.trim() || !noteData.description.trim() || !noteData.category.id) {
            toast.error('Please fill in all fields and select a category');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await notesAPI.createNote({
                title: noteData.title.trim(),
                description: noteData.description.trim(),
                category: {
                    id: noteData.category.id,
                    name: noteData.category.name
                },
                file: noteData.file
            });

            if (response.status === 'success') {
                fetchAndFilterNotes(selectedCategory, 0, pagination.pageSize);
                toast.success('Note created successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });
            }
        } catch (error) {
            console.error('Error creating note:', error);
            toast.error('Failed to create note. Please try again.', {
                duration: 4000,
                position: 'top-right',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNoteClick = (note) => {
        setSelectedNote(note);
        setIsNoteDetailModalOpen(true);
    };

    const handleCloseNoteDetail = () => {
        setIsNoteDetailModalOpen(false);
        setSelectedNote(null);
    };

    const handleEditNote = async (noteData) => {
        if (!noteData.title.trim() || !noteData.description.trim() || !noteData.category.id) {
            toast.error('Please fill in all fields and select a category');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await notesAPI.updateNote({
                id: noteData.id,
                title: noteData.title.trim(),
                description: noteData.description.trim(),
                category: {
                    id: noteData.category.id,
                    name: noteData.category.name
                },
                file: noteData.file
            });

            if (response.status === 'success') {
                if (currentView === 'recycled') {
                    handleRecycleBin();
                } else {
                    fetchAndFilterNotes(selectedCategory, pagination.pageNo, pagination.pageSize);
                }
                toast.success('Note updated successfully!', {
                    duration: 3000,
                    position: 'top-right',
                });
                handleCloseNoteDetail();
            }
        } catch (error) {
            console.error('Error updating note:', error);
            toast.error('Failed to update note. Please try again.', {
                duration: 4000,
                position: 'top-right',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteNote =  async (note) => {
        try {
            await notesAPI.deleteNote(note.id);
            fetchAndFilterNotes(selectedCategory, pagination.pageNo, pagination.pageSize);
            handleCloseNoteDetail();
            toast.success('Note deleted successfully!', {
                duration: 3000,
                position: 'top-right',
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note. Please try again.', {
                duration: 4000,
                position: 'top-right',
            });
        }
    };

    const handleDeleteForever = async (note) => {
        try {
            await notesAPI.deleteNotePermanently(note.id);
            setCurrentView('recycled');
            handleRecycleBin();
            handleCloseNoteDetail();
            toast.success('Note deleted successfully!', {
                duration: 3000,
                position: 'top-right',
            });
        } catch (error) {
            console.error('Error deleting note:', error);
            toast.error('Failed to delete note. Please try again.', {
                duration: 4000,
                position: 'top-right',
            });
        }
    };

    const handleDownloadNote = (note) => {
        // TODO: Implement download functionality
        console.log('Download note:', note.id);
        toast.info('Download functionality will be implemented soon', {
            duration: 3000,
            position: 'top-right',
        });
    };

    const handleCopyNote = (note) => {
        // TODO: Implement copy functionality
        console.log('Copy note:', note.id);
        toast.info('Copy functionality will be implemented soon', {
            duration: 3000,
            position: 'top-right',
        });
    };
    

    

    // Close dropdown when clicking outside
    useEffect(() => {
        fetchCategories();
        fetchAndFilterNotes("All categories", 0, pagination.pageSize);
        const handleClickOutside = (event) => {
            if (pageSizeDropdownRef.current && !pageSizeDropdownRef.current.contains(event.target)) {
                setIsPageSizeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await categoryAPI.getCategory();
            if (response.status === 'success') {
                setCategories(response.data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };





    const fetchAndFilterNotes = async (categoryName, pageNo = 0, pageSize = 20) => {
        try {
            setNotesLoading(true);
            // Fetch all notes without pagination for filtering
            const response = await notesAPI.getNotes(0, 1000); // Fetch a large number to get all notes
            if (response.status === 'success') {
                const allNotes = response.data.notes;
                
                let filteredNotes;
                if (categoryName === 'All categories') {
                    filteredNotes = allNotes;
                } else {
                    filteredNotes = allNotes.filter(note => note.category.name === categoryName);
                }

                // Calculate pagination for filtered notes
                const totalNotesCount = filteredNotes.length;
                const totalPagesCount = Math.ceil(totalNotesCount / pageSize);
                const startIndex = pageNo * pageSize;
                const endIndex = startIndex + pageSize;
                const paginatedNotes = filteredNotes.slice(startIndex, endIndex);

                setNotes(paginatedNotes);
                setPagination({
                    pageNo: pageNo,
                    pageSize: pageSize,
                    totalNotesCount: totalNotesCount,
                    totalPagesCount: totalPagesCount,
                    first: pageNo === 0,
                    last: pageNo >= totalPagesCount - 1 || totalPagesCount === 0
                });
            }
        } catch (error) {
            console.error('Error fetching notes:', error);
        } finally {
            setNotesLoading(false);
        }
    };

    const handlePageChange = (newPageNo) => {
        if (currentView === 'recycled') {
            // Handle pagination for recycled notes
            handleRecycleBinPagination(newPageNo);
        } else {
            fetchAndFilterNotes(selectedCategory, newPageNo, pagination.pageSize);
        }
    };

    const handleRecycleBinPagination = async (pageNo) => {
        try {
            setNotesLoading(true);
            const response = await notesAPI.getRecycledNotes();
            
            if (response.status === 'success') {
                let recycledNotes = response.data;
                
                const totalNotesCount = recycledNotes.length;
                const totalPagesCount = Math.ceil(totalNotesCount / pagination.pageSize);
                const startIndex = pageNo * pagination.pageSize;
                const endIndex = startIndex + pagination.pageSize;
                const paginatedNotes = recycledNotes.slice(startIndex, endIndex);

                setNotes(paginatedNotes);
                setPagination({
                    pageNo: pageNo,
                    pageSize: pagination.pageSize,
                    totalNotesCount: totalNotesCount,
                    totalPagesCount: totalPagesCount,
                    first: pageNo === 0,
                    last: pageNo >= totalPagesCount - 1 || totalPagesCount === 0
                });
            }
        } catch (error) {
            console.error('Error fetching recycled notes:', error);
        } finally {
            setNotesLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen dark:bg-stone-400">
            {/* Toast Container */}
            <Toaster 
                position="top-right"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        style: {
                            background: '#10B981',
                            color: '#fff',
                        },
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#10B981',
                        },
                    },
                    error: {
                        duration: 4000,
                        style: {
                            background: '#EF4444',
                            color: '#fff',
                        },
                        iconTheme: {
                            primary: '#fff',
                            secondary: '#EF4444',
                        },
                    },
                }}
            />
            
            <form className="p-3  mx-auto">
                <div className="flex flex-row justify-center">
                <CategoryDropdown
                    categories={categories}
                    loading={loading}
                    selectedCategory={selectedCategory}
                    onCategorySelect={selectCategory}
                    isOpen={isDropdownOpen}
                    onToggle={() => {
                        toggleDropdown();
                        setCurrentView('notes');
                    }}
                />
                <div className="relative w-100">
                    <input 
                    type="search" 
                    id="search-dropdown" 
                    className="block py-2.5 pl-4 w-full z-20 text-sm text-gray-900 bg-gray-50 rounded-e-lg border-s-gray-50 border-s-2 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-s-gray-700  dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:border-blue-500" 
                    placeholder="Search  Notes.." 
                    required 
                    />
                    <button type="submit" className="absolute top-0 end-0 p-2.5 text-sm font-medium h-full text-white bg-blue-700 rounded-e-lg border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
                        <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                        <span className="sr-only">Search</span>
                    </button>
                </div>
                    
                </div>
            </form>


            {/* Display Notes */}
            <div className="p-4 max-w-7xl mx-auto">
                <div className="mb-4 flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {currentView === 'recycled' ? 'Recycled Notes' : 'Notes'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {pagination.totalNotesCount} total notes
                        </p>

                        {/* Page Size Selector */}
                        <div className="relative" ref={pageSizeDropdownRef}>
                            <button
                                onClick={togglePageSizeDropdown}
                                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-gray-700"
                            >
                                <span className="mr-2">Show:</span>
                                <span className="font-semibold">{pagination.pageSize}</span>
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <div className={`absolute right-0 top-full mt-1 z-100 ${isPageSizeDropdownOpen ? 'block' : 'hidden'} bg-white divide-y divide-gray-100 rounded-lg shadow-lg w-24 dark:bg-gray-700`}>
                                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200">
                                    {[5, 10, 15, 20, 25, 50].map((size) => (
                                        <li key={size}>
                                            <button
                                                onClick={() => handlePageSizeChange(size)}
                                                className={`block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${pagination.pageSize === size ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200' : ''
                                                    }`}
                                            >
                                                {size}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <NotesGrid
                    notes={notes}
                    loading={notesLoading}
                    onPageChange={handlePageChange}
                    pagination={pagination}
                    currentView={currentView}
                    onNoteClick={handleNoteClick}
                />
            </div>

            <AddNoteModal
                isOpen={isAddNoteModalOpen}
                onClose={handleCloseModal}
                categories={categories}
                onSubmit={handleSubmitNote}
                isSubmitting={isSubmitting}
            />

            <NoteDetailModal
                isOpen={isNoteDetailModalOpen}
                onClose={handleCloseNoteDetail}
                note={selectedNote}
                categories={categories}
                onEdit={handleEditNote}
                onDelete={handleDeleteNote}
                onCopy={handleCopyNote}
                onDeletePermanently={handleDeleteForever}
                onDownload={handleDownloadNote}
                isSubmitting={isSubmitting}
                currentView={currentView}
            />

            <FloatingActionButton
                isOpen={isFabOpen}
                onToggle={toggleFab}
                onAddNote={handleAddNote}
                onRecycleBin={handleRecycleBin}
                onDeleteRecycled={handleDeleteRecycled}
                onShowAllNotes={handleShowAllNotes}
            />
        </div>
    );
}

export default Notes;