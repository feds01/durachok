import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface Props {
    className?: string;
}

export default function DividerWrapper({ className }: Props) {
    return <Separator className={cn("w-full bg-border", className)} />;
}
