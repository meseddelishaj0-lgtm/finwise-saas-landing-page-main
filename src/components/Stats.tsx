import stats from "@/data/stats"
import type { ReactNode } from "react"

type Stat = {
    title: string
    icon?: ReactNode
    description: string
}

const Stats: React.FC = () => {
    // ensure the imported value is treated as an array at runtime to avoid mapping a component/function
    const statsArray: Stat[] = Array.isArray(stats) ? (stats as unknown as Stat[]) : []

    return (
        <section id="stats" className="py-10 lg:py-20">
            <div className="grid sm:grid-cols-3 gap-8">
                {statsArray.map((stat: Stat) => (
                    <div key={stat.title} className="text-center sm:text-left max-w-md sm:max-w-full mx-auto">
                        <h3 className="mb-5 flex items-center gap-2 text-3xl font-semibold justify-center sm:justify-start">
                            {stat.icon}
                            {stat.title}
                        </h3>
                        <p className="text-foreground-accent">{stat.description}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}

export default Stats
