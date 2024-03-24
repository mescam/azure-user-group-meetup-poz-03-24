import { ContainerAppEnvironment } from "@cdktf/provider-azurerm/lib/container-app-environment";
import { ContainerApp } from "@cdktf/provider-azurerm/lib/container-app";
import { LogAnalyticsWorkspace } from "@cdktf/provider-azurerm/lib/log-analytics-workspace";
import { Construct } from "constructs";

export interface NordcloudContainerAppProps {
    readonly name: string;
    readonly location: string;
    readonly rgName: string;
    readonly image: string;
}

export class NordcloudContainerApp extends Construct {
    address: string;
    constructor(scope: Construct, id: string, readonly props: NordcloudContainerAppProps) {
        super(scope, id);

        // create log analytics workspace
        const logAnalytics = new LogAnalyticsWorkspace(this, 'LogAnalyticsWorkspace', {
            location: this.props.location,
            name: `${this.props.name}-law`,
            resourceGroupName: this.props.rgName,
            sku: 'PerGB2018',
            retentionInDays: 30,
        });

        // create container app environment
        const env = new ContainerAppEnvironment(this, 'ContainerAppEnvironment', {
            location: this.props.location,
            name: this.props.name,
            resourceGroupName: this.props.rgName,
            logAnalyticsWorkspaceId: logAnalytics.id,
        });

        // create container app
        const app = new ContainerApp(this, 'ContainerApp', {
            containerAppEnvironmentId: env.id,
            name: this.props.name,
            resourceGroupName: this.props.rgName,
            revisionMode: 'Single',
            ingress: {
                targetPort: 80,
                trafficWeight: [{percentage: 100, latestRevision: true}],
                externalEnabled: true,
            },
            template: {
                container: [
                    {
                        name: 'app',
                        image: props.image,
                        cpu: 0.25,
                        memory: "0.5Gi",
                        env: [
                            {
                                name: 'ENVIRONMENT',
                                value: 'PROD'
                            }
                        ]
                    }
                ],

            }
        });

        this.address = app.fqn;
    }
}
