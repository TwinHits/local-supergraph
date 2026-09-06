import Button from "@/renderer/ui/Button";
import Spinner from "@/renderer/ui/Spinner";
import Text from "@/renderer/ui/Text";

export enum RouterState {
  Stopped = "stopped",
  Starting = "starting",
  Running = "running",
}

type LaunchControlProps = {
  state: RouterState;
  address: string;
  onStart: () => void;
  onStop: () => void;
};

/** Start, the wait, and the running address. No status sentences. */
export default function LaunchControl({
  state,
  address,
  onStart,
  onStop,
}: LaunchControlProps) {
  if (state === RouterState.Starting) {
    return <Spinner label="Starting" />;
  }

  if (state === RouterState.Running) {
    return (
      <>
        <Text>{address}</Text>
        <Button onClick={onStop}>Stop</Button>
      </>
    );
  }

  return <Button onClick={onStart}>Start Supergraph</Button>;
}
