import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import type { Subject, ClassEntity } from '../../types';
import { BookOpen, Calendar, MapPin, Users } from 'lucide-react';

export const TeacherSubjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, classData] = await Promise.all([
          api.subjects.getAll(),
          api.classes.getAll(),
        ]);
        setSubjects(subData);
        setClasses(classData);
      } catch (err) {
        console.error('Failed to load subjects and classes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Subjects & Classes</h1>
        <p className="text-xs text-slate-500 mt-1">
          Courses, theory lectures, and practical lab schedules under your instruction.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading courses...</div>
        ) : subjects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No subjects assigned yet.</div>
        ) : (
          subjects.map((sub) => {
            const subClasses = classes.filter((c) => c.subject_id === sub.id);
            return (
              <div
                key={sub.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200">
                      {sub.subject_code}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Semester {sub.semester}</span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-1">{sub.subject_name}</h3>
                  <p className="text-xs text-slate-500 mb-4">{sub.department}</p>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Scheduled Batches / Rooms:
                    </p>
                    {subClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No classes scheduled</p>
                    ) : (
                      subClasses.map((cls) => (
                        <div key={cls.id} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1">
                          <p className="font-bold text-slate-800">{cls.class_name}</p>
                          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{cls.room}</span>
                            {cls.schedule && (
                              <>
                                <span>•</span>
                                <span>{cls.schedule}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
