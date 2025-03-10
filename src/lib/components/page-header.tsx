import Image from "next/image";
import HorizontalLogo from "@/assets/img/hlogodark.png";
import AutoComplete from "@/lib/components/auto-complete";
import { FaSearch } from "react-icons/fa";

interface PageHeaderProps {
	pageContext: string;
	pageTitle: string;
}

export default function PageHeader({ pageContext, pageTitle }: PageHeaderProps) {
	return (
		<header className="sticky top-0 z-10 border-b border-indigo-500 bg-slate-900 text-xs">
			<div className="mx-auto flex w-[75rem] items-center justify-between px-4 py-2.5">
				<div className="flex items-center gap-8">
					<Image src={HorizontalLogo} alt={"Logo"} height={18} />
					<h1 className="text-sm">
						inPulse / {pageContext} /{" "}
						<span className="text-indigo-200">{pageTitle}</span>
					</h1>
				</div>
				<div className="my-auto text-xs">
					<AutoComplete
						options={{}}
						name="search"
						placeholder="Pesquisar"
						rightIcon={<FaSearch className="text-sm" />}
					/>
				</div>
			</div>
		</header>
	);
}
