import React, { useState } from 'react';
import { mockUsers } from '../data/mockData';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { ROLE_ADMIN, ROLE_CUSTOMER, ROLE_PROCUREMENT_MANAGER } from '../constants/roles';

export default function ManageUsers() {
  const [users, setUsers] = useState(mockUsers);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: ROLE_CUSTOMER
  });

  const roles = [
    { value: ROLE_ADMIN, label: 'Administrator' },
    { value: ROLE_PROCUREMENT_MANAGER, label: 'Procurement Manager' },
    { value: ROLE_CUSTOMER, label: 'Customer' }
  ];

  const handleNew = () => {
    setFormData({ username: '', email: '', role: ROLE_CUSTOMER });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      email: user.email || '',
      role: user.role
    });
    setEditingId(user.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== id));
      const mockIndex = mockUsers.findIndex(u => u.id === id);
      if (mockIndex > -1) mockUsers.splice(mockIndex, 1);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim()) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      const updatedUsers = users.map(u =>
        u.id === editingId ? { ...u, ...formData } : u
      );
      setUsers(updatedUsers);
      const mockUser = mockUsers.find(u => u.id === editingId);
      if (mockUser) {
        Object.assign(mockUser, formData);
      }
    } else {
      const newUser = {
        id: Math.max(...mockUsers.map(u => parseInt(u.id)), 0) + 1,
        ...formData
      };
      setUsers([...users, newUser]);
      mockUsers.push(newUser);
    }

    setShowForm(false);
    setFormData({ username: '', email: '', role: ROLE_CUSTOMER });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="page-title">Manage Users</h1>
            <p className="page-subtitle">View and manage system users</p>
          </div>
          <button onClick={handleNew} className="btn btn-primary">
            <Plus size={16} />
            New User
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold" style={{ fontSize: '1.25rem' }}>
                {editingId ? 'Edit User' : 'Create New User'}
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
                <label className="form-label">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="form-input"
                  placeholder="Enter username"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="form-input"
                  placeholder="Enter email"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="form-select"
                >
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
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
                  {editingId ? 'Update User' : 'Create User'}
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
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="text-slate-600">{user.id}</td>
                  <td className="font-semibold">{user.username}</td>
                  <td className="text-slate-600">{user.email || '-'}</td>
                  <td>
                    <span className="badge badge-primary">
                      {user.role}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn btn-ghost btn-icon"
                        title="Edit user"
                        style={{ color: 'var(--color-info)' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-ghost btn-icon"
                        title="Delete user"
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
