type TabsProps = {
    tabs: { title: string }[];
    selectedTab: string;
    onTabChange: (title: string) => void;
}

export const Tabs = ({ tabs, selectedTab, onTabChange }: TabsProps) => (
    <div className="flex px-3 pt-1 justify-around bg-indigo-900 mb-1 h-[50px]">
        {tabs.map(({ title }) => (
            <button
                key={title}
                onClick={() => onTabChange(title)}
                className={`px-4 py-2 rounded-t-[5px] cursor-pointer transition-all duration-200 hover:shadow-md
                    ${selectedTab === title ? 'bg-slate-800 border-b-4 border-slate-800 text-white' : 'bg-slate-900 mb-1 rounded-b-[5px]'}`}
            >
                {title}
            </button>
        ))}
    </div>
);