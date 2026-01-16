import { PreferencesForm } from '@/components/settings/PreferencesForm';

export default function SettingsPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <PreferencesForm />
      </div>
    </div>
  );
}
