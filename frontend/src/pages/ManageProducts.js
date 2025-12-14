import React, { useState, useEffect } from 'react';
import { productsApi } from '../services/api';
import { formatCurrency } from '../utils';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    price: '',
    quantity: ''
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['Microscopes', 'Telescopes', 'Lab Equipment', 'Computer Hardware', 'Software', 'Audio Visual', 'Electronics'];

  const handleNew = () => {
    setFormData({ name: '', category: '', description: '', price: '', quantity: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      category: product.category,
      description: product.description,
      price: product.price.toString(),
      quantity: product.quantity.toString()
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsApi.delete(id);
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error('Failed to delete product:', error);
        alert('Failed to delete product');
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category || !formData.price || !formData.quantity) {
      alert('Please fill in all fields');
      return;
    }

    const price = parseFloat(formData.price);
    const quantity = parseInt(formData.quantity);

    if (isNaN(price) || isNaN(quantity) || price < 0 || quantity < 0) {
      alert('Please enter valid price and quantity');
      return;
    }

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price,
        quantity
      };

      if (editingId) {
        const updated = await productsApi.update(editingId, productData);
        setProducts(products.map(p => p.id === editingId ? updated : p));
      } else {
        const newProduct = await productsApi.create(productData);
        setProducts([...products, newProduct]);
      }

      setShowForm(false);
      setFormData({ name: '', category: '', description: '', price: '', quantity: '' });
    } catch (error) {
      console.error('Failed to save product:', error);
      alert('Failed to save product');
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Manage Products</h1>
            <p className="page-subtitle">Add, edit, or remove products from catalog</p>
          </div>
          <button onClick={handleNew} className="btn btn-primary">
            <Plus size={16} />
            New Product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ fontSize: '1.25rem' }}>
                {editingId ? 'Edit Product' : 'Create New Product'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="btn btn-ghost btn-icon"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  placeholder="Enter product name"
                />
              </div>

              <div className="grid grid-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select category</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="form-input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="form-input"
                  placeholder="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="form-textarea"
                  rows={3}
                  placeholder="Enter product description"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id}>
                  <td className="text-slate-600">{product.id}</td>
                  <td className="font-semibold">{product.name}</td>
                  <td className="text-slate-600">{product.category}</td>
                  <td className="font-semibold text-primary">{formatCurrency(product.price)}</td>
                  <td>{product.quantity}</td>
                  <td>
                    <span className={`badge ${product.status === 'available' ? 'badge-success' : 'badge-danger'}`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="btn btn-ghost btn-icon"
                        title="Edit product"
                        style={{ color: 'var(--color-info)' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="btn btn-ghost btn-icon"
                        title="Delete product"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
