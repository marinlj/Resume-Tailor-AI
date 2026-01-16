import { AchievementList } from '@/components/library/AchievementList';

export default function LibraryPage() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Achievement Library</h1>
        <AchievementList />
      </div>
    </div>
  );
}
