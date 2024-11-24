import { Loader } from "lucide-react";

export default function Loading() {
  // Or a custom loading skeleton component
  return (
    <div className="bg-opacity-20 flex justify-center items-center h-screen">
      <Loader className="animate-spin" size={100} />
    </div>
  );
}