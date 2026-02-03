import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldLabelProps {
    label: string;
    required?: boolean;
    className?: string;
}

const FieldLabel = ({ label, className, required = false }: FieldLabelProps) => {
    return (
        <Label className={cn("font-bold", className)}>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
        </Label>
    );
};

export default FieldLabel;
