import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { ClassEntity, Subject, Teacher } from '../../types';
import { CalendarDays, Plus, Search, Edit2, Trash2, X, MapPin } from 'lucide-react';

export const AdminClasses: React.FC = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);

  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    class_name: '',
    room: '',
    schedule: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cList, sList, tList] = await Promise.all([
        api.classes.getAll(),
        api.subjects.getAll(),
        api.teachers.getAll(),
      ]);
      setClasses(cList);
      setSubjects(sList);
      setTeachers(tList);
      if (sList.length > 0 && !formData.subject_id) {
        setFormData((prev) => ({ ...prev, subject_id: String(sList[0].id) }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.classes.create({
        subject_id: Number(formData.subject_id),
        teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null,
        class_name: formData.class_name,
        room: formData.room,
        schedule: formData.schedule,
      });
      setShowAddModal(false);
      setFormData({
        subject_id: subjects.length > 0 ? String(subjects[0].id) : '',
        teacher_id: '',
        class_name: '',
        room: '',
        schedule: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create class');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    try {
      await api.classes.update(editingClass.id, {
        subject_id: editingClass.subject_id,
        teacher_id: editingClass.teacher_id,
        class_name: editingClass.class_name,
        room: editingClass.room,
        schedule: editingClass.schedule,
      });
      setShowEditModal(false);
      setEditingClass(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update class');
    }
  };

  const handleDelete = async (c: ClassEntity) => {
    if (!window.confirm(`Delete class session '${c.class_name}'?`)) return;
    try {
      await api.classes.delete(c.id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete class');
    }
  };

  const filtered = classes.filter(
    (c) =>
      c.class_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject_name && c.subject_name.toLowerCase().includes(search.toLowerCase())) ||
      (c.room && c.room.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Classes & Room Allocations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure lecture halls, lab sections, room numbers, and weekly timetables.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Schedule New Class</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search classes or rooms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Class Session Name</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Assigned Instructor</th>
                <th className="py-3.5 px-4">Room Location</th>
                <th className="py-3.5 px-4">Timetable Schedule</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading scheduled classes...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No classes found.</td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-800">{c.class_name}</td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="font-semibold text-blue-700">{c.subject_code}</span>
                      <p className="text-[11px] text-slate-400">{c.subject_name}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {c.teacher_name || <span className="text-amber-600 italic">None</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{c.room}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{c.schedule || 'N/A'}</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingClass(c);
                          setShowEditModal(true);
                        }}
                        className="text-slate-500 hover:text-blue-600 p-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-slate-500 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-800">Schedule New Class</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.subject_code} - {s.subject_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Class Section Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DBMS Theory - Batch A"
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Room / Hall *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Room 302"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Instructor</label>
                  <select
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                  >
                    <option value="">Subject Default</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Details</label>
                <input
                  type="text"
                  placeholder="e.g. Mon, Wed 09:00 - 10:00 AM"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
