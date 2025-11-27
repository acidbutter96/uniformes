import Image from 'next/image';
import { cn } from '@/app/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button, type ButtonProps } from '@/components/ui/Button';

export interface UniformCardProps {
  imageSrc: string;
  imageAlt: string;
  name: string;
  description: string;
  onSelect?: () => void;
  buttonLabel?: string;
  buttonProps?: Omit<ButtonProps, 'children' | 'onClick'>;
  className?: string;
}

export function UniformCard({
  imageSrc,
  imageAlt,
  name,
  description,
  onSelect,
  buttonLabel = 'Selecionar',
  buttonProps,
  className,
}: UniformCardProps) {
  return (
    <Card interactive className={cn('flex h-full flex-col gap-md', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(min-width: 768px) 320px, 100vw"
        />
      </div>

      <div className="flex flex-col gap-xs">
        <h3 className="text-h3 font-heading text-text">{name}</h3>
        <p className="text-body text-text-muted">{description}</p>
      </div>

      <Button
        fullWidth
        onClick={onSelect}
        {...buttonProps}
        className={cn('mt-auto', buttonProps?.className)}
      >
        {buttonLabel}
      </Button>
    </Card>
  );
}
