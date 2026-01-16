import { LoginButtons } from '@/components/auth/LoginButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Note: Redirect logic for logged-in users is handled by middleware
export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Resume Tailor AI</CardTitle>
          <CardDescription>
            Sign in to create tailored resumes from your achievement library
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <LoginButtons />
        </CardContent>
      </Card>
    </div>
  );
}
