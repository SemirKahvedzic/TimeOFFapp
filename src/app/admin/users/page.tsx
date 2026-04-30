"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { UserPlus, Trash2, Pencil, Shield, Crown, User as UserIcon, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, FieldLabel } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Badge";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/utils";
import { isOwnerEmail } from "@/lib/owner";
import { useT } from "@/lib/i18n/context";
import { usePageTitle } from "@/lib/usePageTitle";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  jobTitle?: string | null;
  createdAt: string;
  department?: { id: string; name: string; color: string } | null;
  manager?:    { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
  color: string;
}

export default function AdminUsersPage() {
  usePageTitle("nav.team");
  const t = useT();
  const { data: session } = useSession();
  const viewerIsOwner = isOwnerEmail(session?.user?.email);
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("employee");
  const [savingEdit, setSavingEdit] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [u, d] = await Promise.all([fetch("/api/users"), fetch("/api/departments")]);
    if (u.ok) setUsers(await u.json());
    if (d.ok) setDepartments(await d.json());
    setLoading(false);
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password, role,
          jobTitle: jobTitle || null,
          departmentId: departmentId || null,
          managerId: managerId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t("users.toast.added"));
      setShowModal(false);
      setName(""); setEmail(""); setPassword(""); setRole("employee");
      setJobTitle(""); setDepartmentId(""); setManagerId("");
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditName(u.name);
    setEditRole(u.role);
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/users/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), role: editRole }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("users.toast.updated"));
      setEditTarget(null);
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/users/${target.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("users.toast.removed"));
      fetchAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "var(--ink-mute)" }}>
            {t("team.label")}
          </p>
          <h1 className="text-3xl font-black tracking-tight mt-1" style={{ color: "var(--ink)" }}>
            {t("team.title")}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--ink-soft)" }}>
            {t("team.subtitle", { count: users.length })}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <UserPlus size={15} />
          {t("team.invite")}
        </Button>
      </div>

      <div className="rounded-3xl" style={{ background: "var(--surface-2)", boxShadow: "var(--soft-1)" }}>
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--ink-mute)" }}>{t("common.loading")}</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {users.map((u) => {
              const rowIsOwner = isOwnerEmail(u.email);
              const canEdit   = rowIsOwner ? viewerIsOwner : true;
              const canDelete = rowIsOwner
                ? false
                : u.role === "admin"
                  ? viewerIsOwner
                  : true;
              return (
              <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} size={42} className="rounded-full shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{u.name}</p>
                      {rowIsOwner ? (
                        <Pill label={t("users.kind.owner")} color="#f59e0b" icon={<Crown size={9} />} />
                      ) : u.role === "admin" ? (
                        <Pill label={t("users.kind.admin")} color="#7c5cff" icon={<Shield size={9} />} />
                      ) : (
                        <Pill label={t("users.kind.employee")} color="#64748b" icon={<UserIcon size={9} />} />
                      )}
                      {u.department && (
                        <Pill label={u.department.name} color={u.department.color} />
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--ink-mute)" }}>
                      {u.jobTitle && (
                        <>
                          <Briefcase size={9} className="inline mr-1" />
                          {u.jobTitle} ·{" "}
                        </>
                      )}
                      {u.email}
                      {u.manager && <> · {t("users.reportsTo")} {u.manager.name}</>}
                      {" · "}{t("users.joined")} {formatDate(u.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => openEdit(u)}
                      className="p-2 rounded-full transition-all text-[color:var(--ink-faint)] hover:text-[color:var(--brand)] hover:bg-[color:var(--brand-soft)]"
                      aria-label={t("users.edit.aria")}
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                      className="p-2 rounded-full transition-all text-[color:var(--ink-faint)] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)]"
                      aria-label="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t("users.delete.title")}
        subtitle={deleteTarget ? t("users.delete.body", { name: deleteTarget.name }) : ""}
        size="sm"
      >
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>{t("btn.cancel")}</Button>
          <Button variant="danger" className="flex-1" onClick={doDelete}>{t("users.delete.confirm")}</Button>
        </div>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={t("users.edit.title")}
        subtitle={t("users.edit.subtitle")}
        size="sm"
      >
        <form onSubmit={handleEditSave} className="space-y-4">
          <div>
            <FieldLabel>{t("users.fields.fullName")}</FieldLabel>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>
          <div>
            <FieldLabel>{t("users.fields.role")}</FieldLabel>
            <Select
              value={editRole}
              onChange={(e) => setEditRole(e.target.value)}
              disabled={isOwnerEmail(editTarget?.email)}
            >
              <option value="employee">{t("users.kind.employee")}</option>
              <option value="admin">{t("users.kind.admin")}</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>
              {t("btn.cancel")}
            </Button>
            <Button
              type="submit"
              loading={savingEdit}
              disabled={
                !editTarget ||
                !editName.trim() ||
                (editName.trim() === editTarget.name && editRole === editTarget.role)
              }
              className="flex-1"
            >
              {t("users.edit.save")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={t("team.invite")} size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>{t("users.fields.fullName")}</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required />
            </div>
            <div>
              <FieldLabel>{t("users.fields.jobTitle")}</FieldLabel>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Designer" />
            </div>
          </div>
          <div>
            <FieldLabel>{t("users.fields.email")}</FieldLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" required />
          </div>
          <div>
            <FieldLabel>{t("users.fields.password")}</FieldLabel>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("users.invite.subtitle")} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>{t("users.fields.role")}</FieldLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="employee">{t("users.kind.employee")}</option>
                <option value="admin">{t("users.kind.admin")}</option>
              </Select>
            </div>
            <div>
              <FieldLabel>{t("users.fields.dept")}</FieldLabel>
              <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
                <option value="">—</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel>{t("users.fields.manager")}</FieldLabel>
              <Select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                <option value="">—</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" loading={creating} className="w-full" size="lg">
            {t("users.invite.send")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
