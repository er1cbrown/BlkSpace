import { Redirect } from "wouter";
import { getCurrentHandle } from "@/lib/auth";

/** Media is account-bound — redirect to profile grid / library */
export default function MediaPage() {
  return <Redirect to={`/profile/${getCurrentHandle()}?tab=grid`} />;
}