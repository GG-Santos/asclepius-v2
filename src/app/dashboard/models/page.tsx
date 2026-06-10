import { redirect } from "next/navigation";

export default function ModelsPage() {
  redirect("/dashboard/assets?tab=models");
}
