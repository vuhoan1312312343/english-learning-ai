import type { NextPage } from "next";
import React, { useEffect, useRef, useState } from "react";
import { BottomBar } from "~/components/BottomBar";
import { LeftBar } from "~/components/LeftBar";
import { TopBar } from "~/components/TopBar";
import { SettingsRightNav } from "~/components/SettingsRightNav";
import { useAuthStore } from "~/stores/createAuthStore";
import { authAPI } from "~/utils/api";
import { getLevelBadgeClassName } from "~/utils/level-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
const LEVELS: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const LEVEL_DESC: Record<CEFRLevel, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper-Inter.",
  C1: "Advanced",
  C2: "Proficient",
};

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.222-3.592m3.218-2.16A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.846 3.258M15 12a3 3 0 01-4.243 4.243M3 3l18 18" />
    </svg>
  );

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const Account: NextPage = () => {
  const { user, setUser } = useAuthStore();

  // Profile state
  const [name, setName] = useState(user?.name ?? "");
  const [avatar, setAvatar] = useState(user?.avatar ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [level, setLevel] = useState<CEFRLevel>((user?.level as CEFRLevel) ?? "A1");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setAvatar(user.avatar ?? "");
      setLevel((user.level as CEFRLevel) ?? "A1");
    }
  }, [user?.name, user?.avatar, user?.level]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      let newAvatarUrl = avatar;
      if (avatarFile) {
        const uploadRes = await authAPI.uploadAvatar(avatarFile);
        newAvatarUrl = uploadRes.data.avatarUrl as string;
        setAvatar(newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      const profileRes = await authAPI.updateProfile({ name: name.trim(), avatar: newAvatarUrl.trim() });
      if (level !== user?.level) await authAPI.updateLevel(level);
      const updated = profileRes.data.user;
      setUser({ ...updated, id: updated.id ?? user?.id ?? "", level });
      setProfileMsg({ type: "success", text: "" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err?.response?.data?.message ?? "Failed to update profile." });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setPasswordMsg({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      setPasswordMsg({ type: "error", text: err?.response?.data?.message ?? "Failed to change password." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const profileDirty = name.trim() !== (user?.name ?? "") || avatarFile !== null || level !== (user?.level ?? "A1");
  const avatarSrc = avatarPreview ?? (avatar ? (avatar.startsWith("http") ? avatar : `${API_URL}${avatar}`) : null);

  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <LeftBar selectedTab={null} />
      <BottomBar selectedTab={null} />

      <div className="mx-auto flex flex-col gap-5 px-4 py-20 sm:py-10 md:pl-28 lg:pl-72">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between lg:max-w-4xl">

          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
          </div>
        </div>

        <div className="flex justify-center gap-12">
            <div className="flex w-full max-w-xl flex-col gap-6">

              {/* Personal section */}
              <div className="bg-white px-1">

                <div className="px-6 py-6 flex flex-col gap-6">
                  {/* Avatar + Name row */}
                  <div className="flex items-center gap-6">
                    {/* Avatar with overlay */}
                    <div className="relative shrink-0 group">
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt="avatar"
                          className="h-20 w-20 rounded-full object-cover ring-2 ring-gray-100"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-3xl font-bold text-white ring-2 ring-gray-100">
                          {name ? name[0]?.toUpperCase() : "?"}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Change profile picture"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </div>

                    {/* Name + Upload hint */}
                    <div className="flex flex-col gap-1 grow min-w-0">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full name</label>
                      <input
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        maxLength={100}
                      />
                      {avatarFile ? (
                        <p className="text-xs text-blue-500 truncate">📎 {avatarFile.name}</p>
                      ) : null}
                    </div>
                  </div>

                  {/* Level */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Proficiency level</label>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {LEVELS.map((lvl) => {
                        const active = level === lvl;
                        return (
                          <button
                            key={lvl}
                            onClick={() => setLevel(lvl)}
                            className={[
                              "flex flex-col items-center rounded-xl border-2 px-2 py-2.5 transition cursor-pointer",
                              active
                                ? getLevelBadgeClassName(lvl) + " shadow-sm scale-[1.03]"
                                : "border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200 hover:text-gray-600",
                            ].join(" ")}
                          >
                            <span className="text-sm font-bold">{lvl}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                  {profileMsg ? (
                    <span className={["flex items-center gap-1.5 text-sm font-medium",
                      profileMsg.type === "success" ? "text-green-600" : "text-red-500"].join(" ")}>
                      {profileMsg.type === "success" && <CheckIcon />}
                      {profileMsg.text}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={handleSaveProfile}
                    disabled={!profileDirty || profileLoading}
                    className="flex items-center gap-2 rounded-xl border-b-4 border-green-600 bg-green-500 px-5 py-2.5 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:border-b-0 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {profileLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Saving...
                      </>
                    ) : "Save changes"}
                  </button>
                </div>
              </div>

              {/* Password section */}
              <div className="bg-white px-1 pt-2">
                <div className="px-6 py-2">
                  <h2 className="font-semibold text-gray-800">Change Password</h2>
                </div>

                <div className="px-6 py-6 flex flex-col gap-4">
                  {[
                    { label: "Current password", value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent((v) => !v) },
                    { label: "New password", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew((v) => !v) },
                    { label: "Confirm new password", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm((v) => !v) },
                  ].map(({ label, value, set, show, toggle }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-gray-500">{label}</label>
                      <div className="relative">
                        <input
                          type={show ? "text" : "password"}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-10 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition"
                          value={value}
                          onChange={(e) => set(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={toggle}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <EyeIcon open={show} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Password strength hint */}
                  {newPassword.length > 0 && (
                    <div className="flex items-center gap-2">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className={["h-1.5 flex-1 rounded-full transition-all",
                            newPassword.length < 6 ? "bg-red-300" :
                            newPassword.length < 10 ? i < 2 ? "bg-yellow-400" : "bg-gray-200" :
                            "bg-green-400"
                          ].join(" ")}
                        />
                      ))}
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {newPassword.length < 6 ? "Too short" : newPassword.length < 10 ? "Fair" : "Strong"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between px-6 py-4">
                  {passwordMsg ? (
                    <span className={["flex items-center gap-1.5 text-sm font-medium",
                      passwordMsg.type === "success" ? "text-green-600" : "text-red-500"].join(" ")}>
                      {passwordMsg.type === "success" && <CheckIcon />}
                      {passwordMsg.text}
                    </span>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={!currentPassword || !newPassword || !confirmPassword || passwordLoading}
                    className="flex items-center gap-2 rounded-xl border-b-4 border-blue-600 bg-blue-500 px-5 py-2.5 text-sm font-bold uppercase text-white transition hover:brightness-110 disabled:border-b-0 disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    {passwordLoading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Updating...
                      </>
                    ) : "Change password"}
                  </button>
                </div>
              </div>

            </div>

          {/* Right nav */}
          <SettingsRightNav selectedTab="Account" />
        </div>
      </div>
    </div>
  );
};

export default Account;
