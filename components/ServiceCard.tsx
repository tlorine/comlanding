type ServiceCardProps = {
  title: string
  description: string
  number: string
}

export default function ServiceCard({
  title,
  description,
  number,
}: ServiceCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <span>{number}</span>

      <h2>{title}</h2>

      <p>{description}</p>
    </article>
  )
}