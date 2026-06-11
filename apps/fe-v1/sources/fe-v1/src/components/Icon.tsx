import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
}

const Icon = ({ name, className, filled = false }: IconProps) => {
  return (
    <span 
      className={cn(
        "material-symbols-outlined",
        className
      )}
      style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
    >
      {name}
    </span>
  );
};

export default Icon;
