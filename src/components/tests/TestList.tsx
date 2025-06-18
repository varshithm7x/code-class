import React from 'react';
import TestCard, { CodingTest } from './TestCard';

interface TestListProps {
  tests: CodingTest[];
  isTeacher?: boolean;
  onEdit?: (testId: string) => void;
  onDelete?: (testId: string) => void;
  onView?: (testId: string) => void;
  emptyMessage?: string;
}

const TestList: React.FC<TestListProps> = ({
  tests,
  isTeacher = false,
  onEdit,
  onDelete,
  onView,
  emptyMessage = "No tests available"
}) => {
  if (tests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tests.map((test) => (
        <TestCard
          key={test.id}
          test={test}
          isTeacher={isTeacher}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
        />
      ))}
    </div>
  );
};

export default TestList; 