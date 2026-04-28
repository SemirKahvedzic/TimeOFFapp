"use client";
import { useState, useEffect, useCallback } from "react";
import { UserPlus, Trash2, Shield, User as UserIcon, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, FieldLabel } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Badge";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/utils";
import { sendInvitationEmail } from "@/lib/email";
import { useT } from "@/lib/i18n/context";

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
  const t = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

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
      const savedName = name, savedEmail = email, savedPassword = password;
      setName(""); setEmail(""); setPassword(""); setRole("employee");
      setJobTitle(""); setDepartmentId(""); setManagerId("");
      fetchAll();
      sendInvitationEmail(savedName, savedEmail, savedPassword).catch(() => {
        toast.error("Member created but invite email failed");
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
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
          <div className="py-12 text-center text-sm" style={{ color: "var(--ink-mute)" }}>Loading…</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--line)" }}>
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: "1px solid var(--line)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={u.name} size={42} className="rounded-full shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>{u.name}</p>
                      {u.role === "admin" ? (
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
                <button
                  onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                  className="p-2 rounded-full transition-all"
                  style={{ color: "var(--ink-faint)" }}
                  aria-label="Remove member"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
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
