import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CreatePollPage() {
  return (
    <Card className="w-[600px] mx-auto mt-10">
      <CardHeader>
        <CardTitle>Create New Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          <Input placeholder="Poll Question" />
          <Textarea placeholder="Poll Description" />
          <div className="space-y-2">
            <Input placeholder="Option 1" />
            <Input placeholder="Option 2" />
            <Button variant="ghost" className="w-full">
              Add Another Option
            </Button>
          </div>
          <Button type="submit" className="w-full">
            Create Poll
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}