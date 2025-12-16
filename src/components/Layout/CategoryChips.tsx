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
    <div className="border-b border-border bg-background">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 px-4 py-3">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selected === category ? "default" : "secondary"}
              size="sm"
              className={`rounded-full px-4 h-8 text-sm font-medium transition-all border-0 ${
                selected === category
                  ? "bg-gradient-to-r from-[#00D4FF] to-[#00B4D8] text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                  : "bg-gradient-to-r from-[#00D4FF]/80 to-[#00B4D8]/80 text-white/90 hover:from-[#00D4FF] hover:to-[#00B4D8] hover:text-white"
              }`}
              onClick={() => onSelect?.(category)}
            >
              {category}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
