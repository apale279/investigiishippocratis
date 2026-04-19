import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { PlacesDirectory } from "@/components/PlacesDirectory";

export const metadata: Metadata = {
  title: "Elenco luoghi | In vestigiis Hippocratis",
  description:
    "Elenco di tutti i luoghi della storia della medicina: cerca, filtra per categoria e apri sulla mappa.",
};

export default function LuoghiPage() {
  return (
    <div className="flex min-h-screen flex-col bg-stone-100 dark:bg-stone-950">
      <AppHeader />
      <PlacesDirectory />
    </div>
  );
}
