import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AchievementCardProps {
  achievement: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    startDate: Date | null;
    endDate: Date | null;
    text: string;
    tags: string[];
  };
}

export function AchievementCard({ achievement }: AchievementCardProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const dateRange = [formatDate(achievement.startDate), formatDate(achievement.endDate) || 'Present']
    .filter(Boolean)
    .join(' - ');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{achievement.company}</CardTitle>
            <p className="text-sm text-muted-foreground">{achievement.title}</p>
          </div>
          {dateRange && (
            <span className="text-xs text-muted-foreground">{dateRange}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-3">{achievement.text}</p>
        <div className="flex flex-wrap gap-1">
          {achievement.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
