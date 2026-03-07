import { useConfigStore } from "../../store/configStore";
import { useClientStore } from "../../store/clientStore";
import { getConfigurableClients } from "../../lib/clients";
import ConfigClientItem from "./ConfigClientItem";
import type { ClientType } from "../../types/client";

const typeOrder: ClientType[] = ["Desktop", "IDE", "CLI"];

function ConfigClientSelector() {
  const { selectedClientId, setSelectedClient } = useConfigStore();
  const clients = useClientStore((s) => s.clients);
  const configurableClients = getConfigurableClients();

  const grouped = typeOrder
    .map((type) => ({
      type,
      items: configurableClients.filter((c) => c.type === type),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="w-64 flex-shrink-0 border-r border-border flex flex-col h-full bg-base-light/30">
      <div className="px-4 pt-4 pb-4 border-b border-border">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Clients
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {grouped.map((group) => (
          <div key={group.type}>
            <div className="px-2 mb-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              {group.type}
            </div>
            <div className="space-y-1">
              {group.items.map((client) => {
                const state = clients.find((c) => c.meta.id === client.id);
                return (
                  <ConfigClientItem
                    key={client.id}
                    client={client}
                    isSelected={selectedClientId === client.id}
                    configExists={state?.configExists ?? false}
                    onSelect={() => setSelectedClient(client.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConfigClientSelector;
