import { useEffect, useState } from 'react';
import { Users, Plus, Trash2, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Table, Tr, Td, EmptyState } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Field, Input, Select } from '../components/ui/Input';
import { formatDateTime, timeAgo } from '../lib/utils';
import type { Profile, Role } from '../types';

export function UsersPage() {
  const { session } = useAuth();
  const { push } = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', displayName: '', role: 'viewer' as Role });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers((data as Profile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createUser = async () => {
    if (!form.email || !form.password) return;
    const { data, error } = await supabase.auth.signUp({ email: form.email, password: form.password });
    if (error) { push('error', 'Failed', error.message); return; }
    if (data.user) {
      await supabase.from('profiles').insert({ user_id: data.user.id, email: form.email, display_name: form.displayName || 'User', role: form.role });
    }
    push('success', 'User created', form.email);
    setShowModal(false);
    setForm({ email: '', password: '', displayName: '', role: 'viewer' });
    await load();
  };

  const updateRole = async (userId: string, role: Role) => {
    await supabase.from('profiles').update({ role }).eq('user_id', userId);
    setUsers((us) => us.map((u) => (u.user_id === userId ? { ...u, role } : u)));
    push('success', 'Role updated', role);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card><CardBody><div><p className="text-xs text-slate-400">Total Users</p><p className="text-2xl font-bold text-slate-100 mt-1">{users.length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Admins</p><p className="text-2xl font-bold text-rose-400 mt-1">{users.filter((u) => u.role === 'admin').length}</p></div></CardBody></Card>
        <Card><CardBody><div><p className="text-xs text-slate-400">Active</p><p className="text-2xl font-bold text-emerald-400 mt-1">{users.filter((u) => u.status === 'active').length}</p></div></CardBody></Card>
      </div>

      <Card>
        <CardHeader title="User Management" subtitle={`${users.length} users registered`} icon={Users} action={<Button size="sm" onClick={() => setShowModal(true)}><Plus className="w-3.5 h-3.5" /> Add User</Button>} />
        {loading ? (
          <p className="text-sm text-slate-500 text-center py-12">Loading...</p>
        ) : users.length === 0 ? (
          <EmptyState icon={Users} title="No users" message="Create a user account to get started" />
        ) : (
          <Table headers={['User', 'Email', 'Role', 'Status', 'Last Login', 'Created', 'Actions']}>
            {users.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center text-xs font-bold text-slate-950">
                      {u.display_name[0].toUpperCase()}
                    </div>
                    <p className="text-sm font-medium text-slate-200">{u.display_name}</p>
                  </div>
                </Td>
                <Td className="text-xs text-slate-400">{u.email}</Td>
                <Td>
                  <Select value={u.role} onChange={(e) => updateRole(u.user_id, e.target.value as Role)} className="h-7 text-xs w-28">
                    <option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option>
                  </Select>
                </Td>
                <Td><Badge tone={u.status === 'active' ? 'emerald' : 'rose'}>{u.status}</Badge></Td>
                <Td className="text-xs text-slate-500">{u.last_login_at ? timeAgo(u.last_login_at) : 'never'}</Td>
                <Td className="text-xs text-slate-500 whitespace-nowrap">{formatDateTime(u.created_at)}</Td>
                <Td>
                  {u.user_id !== session?.user?.id && (
                    <button className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400" title="Remove access">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New User">
        <div className="space-y-4">
          <Field label="Display Name"><Input value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} placeholder="John Analyst" /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@company.com" /></Field>
          <Field label="Password"><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="admin">Admin</option><option value="analyst">Analyst</option><option value="viewer">Viewer</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={createUser}><User className="w-4 h-4" /> Create User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
