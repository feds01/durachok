import { Bars } from "react-loader-spinner";

import { cn } from "@/lib/utils";

interface Props {
    className?: string;
}

const Loader = ({ className }: Props) => {
    return (
        <div className={cn("flex justify-center items-center flex-col h-full", className)}>
            <Bars wrapperClass="[&_svg]:mx-auto [&_svg]:w-full" color="#FFFFFF" height={80} width={80} />
        </div>
    );
};

export default Loader;
