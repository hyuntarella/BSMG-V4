import dynamic from 'next/dynamic';

const ProposalEditor = dynamic(
  () => import('@/components/proposal/ProposalEditor'),
  { ssr: false }
);

export default function ProposalPage() {
  return <ProposalEditor />;
}
