import React, { useState, useEffect } from 'react';
import { categoryAPI } from '../../services/api.js';
import { theme } from '../../theme.js';
import DeleteIcon from '@mui/icons-material/Delete';

function Category() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'description' && value.length > 180) {
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.description.trim()) return;

    try {
      setIsSubmitting(true);
      await categoryAPI.createCategory(formData);
      setFormData({ name: '', description: '', isActive: true });
      await fetchCategories(); // Refresh the list
      showToast('Category added successfully!');
    } catch (error) {
      console.error('Error creating category:', error);
      showToast('Failed to add category. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await categoryAPI.deleteCategory(id);
      await fetchCategories();
      setDeleteConfirm(null);
      showToast('Category deleted successfully!');
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('Failed to delete category. Please try again.', 'error');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-stone-800">
      {/* Toast Message */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-6 py-4 rounded-lg shadow-lg text-white font-semibold ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } animate-fade-in`}>
            <div className="flex items-center gap-2">
              <span>{toast.type === 'success' ? '✅' : '❌'}</span>
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Form */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-800 mb-5">
          Add New Category
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="text"
              name="name"
              placeholder="Category name..."
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 text-base border-3 border-gray-200 rounded-lg bg-white text-gray-800 outline-none transition-colors duration-200 focus:border-green-500 font-sans ${formData.name.length > 0 ? 'border-green-500' : 'border-gray-200'}`}
              required
            />
          </div>
          
          <div className="mb-5">
            <textarea
              name="description"
              placeholder="Category description..."
              value={formData.description}
              onChange={handleInputChange}
              rows="3"
              required
              maxLength="100"
              className={`w-full px-4 py-3 text-base border-3 border-gray-200 rounded-lg bg-white text-gray-800 outline-none transition-colors duration-200 focus:border-green-500 font-sans resize-y ${formData.description.length > 0 ? 'border-green-500' : 'border-gray-200'}`}
            />
            <div className="text-xs text-gray-400 mt-1 text-right">
              {formData.description.length}/100 characters
            </div>
          </div>
          
          <button
            type="submit"
            // disabled={isSubmitting || !formData.name.trim() || !formData.description.trim()}
            className="bg-green-700 hover:bg-green-600  text-white px-6 py-3 rounded-lg text-base font-semibold transition-all duration-200 font-sans"
          >
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </button>
        </form>
      </div>

      {/* Categories Grid */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
          Categories
        </h1>

        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No categories found. Add your first category above!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:translate-x-1 hover:-translate-y-1 relative group"
              >
                <div className="absolute top-3 right-3  transition-opacity duration-200">
                  <button
                    onClick={() => setDeleteConfirm(category)}
                    className="bg-red-600 hover:bg-red-500 text-white p-1 rounded-lg text-xs font-semibold transition-all duration-300 ease-out hover:scale-110 cursor-pointer"
                    title="Delete category"
                  >
                    <DeleteIcon  />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-2 pr-12">
                  {category.name}
                </h3>
                
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {category.description || 'No description'}
                </p>
                
                <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                  Created: {formatDate(category.createdDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Delete Category
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "<strong>{deleteConfirm.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-semibold transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default Category;