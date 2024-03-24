import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";

class Application extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AzurermProvider(this, 'AzureRm', {
      disableTerraformPartnerId: true,
      storageUseAzuread: true,
      features: {}
    });

    new ResourceGroup(this, 'ResourceGroup', {
      name: `rg-test-cdktf`,
      location: 'westeurope',
    });
  }
}

const app = new App();
new Application(app, "cdktf");
app.synth();
