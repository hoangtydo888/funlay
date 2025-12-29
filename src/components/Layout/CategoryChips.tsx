import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const categories = [
  "Tất cả",
  "Âm nhạc",
  "Trực tiếp",
  "Danh sách kết hợp",
  "Trò chơi",
  "Podcast",
  "Tin tức",
  "Thiên nhiên",
  "Thủ công",
  "Mới tải lên gần đây",
  "Đã xem",
  "Đề xuất mới",
];

interface CategoryChipsProps {
  selected?: string;
  onSelect?: (category: string) => void;
}

export const CategoryChips = ({ selected = "Tất cả", onSelect }: CategoryChipsProps) => {
  return (
    <div className="sticky top-14 z-30 border-b border-border bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 py-3">
          {categories.map((category) => (
          <Button
            key={category}
            variant="ghost"
            size="sm"
            className={`rounded-full px-5 h-10 text-sm font-semibold transition-all duration-300 ${
              selected === category
                ? "!bg-gradient-to-r !from-cyan-300/80 !to-cyan-400/80 !text-cyan-800 shadow-lg hover:shadow-xl hover:scale-105"
                : "!bg-cyan-100/60 !text-cyan-600 border border-cyan-300/50 hover:!bg-cyan-200/70 hover:scale-105"
            }`}
            onClick={() => onSelect?.(category)}
          >
              {category}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  );
};
