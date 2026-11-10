export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  group_id: string | null;
  role: "student" | "admin";
  theme: "light" | "dark" | "system";
  notify_email: boolean;
};
