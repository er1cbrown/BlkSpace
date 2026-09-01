import { Navbar } from "@/components/layout/Navbar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Link } from "wouter";
import { SignInForm } from "@/components/auth/SignInForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl font-serif">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Handle and the password you set.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <SignInForm />
            <p className="text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link
                href="/welcome"
                className="text-primary font-medium hover:underline"
              >
                Join the yard
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
