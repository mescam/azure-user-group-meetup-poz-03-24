import { Construct } from "constructs";
import { App, TerraformOutput, TerraformStack } from "cdktf";
import { AzurermProvider } from "@cdktf/provider-azurerm/lib/provider";
import { ResourceGroup } from "@cdktf/provider-azurerm/lib/resource-group";
import { NordcloudContainerApp } from "./constructs/container";
import { NordcloudAks } from "./constructs/aks";


class Application extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new AzurermProvider(this, 'AzureRm', {
      disableTerraformPartnerId: true,
      storageUseAzuread: true,
      features: {}
    });

    const rg = new ResourceGroup(this, 'ResourceGroup', {
      name: `rg-test-cdktf`,
      location: 'westeurope',
    });

    const app = new NordcloudContainerApp(this, 'NordcloudContainerApp', {
      name: 'nordcloud-app',
      location: rg.location,
      rgName: rg.name,
      image: 'nginx',
    });

    new TerraformOutput(this, 'ContainerAppAddress', {
      value: app.address,
      sensitive: true,
    });

    // now the AKS part

    const rg2 = new ResourceGroup(this, 'ResourceGroup2', {
      name: `rg-test-cdktf2`,
      location: 'westeurope',
    });

    new NordcloudAks(this, 'NordcloudAks', {
      location: rg2.location,
      name: 'nordcloud-aks',
      rgName: rg2.name,
      nodeCount: 1,
      nodeSize: 'standard_a2_v2',
      nginxEnable: true,
      certbotEnable: true,
    });


  }
}

const app = new App();
new Application(app, "cdktf");
app.synth();
