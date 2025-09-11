import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "@/components/ui/dialog"
  import { Button } from "@/components/ui/button"
  import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
  import { Territory, Location } from "@/types"
  import { Edit } from "lucide-react"
  import { MapDisplay } from "@/components/common/map-display"
  
  interface DetailsDialogProps {
    isOpen: boolean
    onOpenChange: (isOpen: boolean) => void
    onEdit: () => void
    item: any
    itemType: 'territory' | 'location'
    title: string
  }
  
  const DetailItem = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined) return null
  
    const renderValue = () => {
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      if (value instanceof Date) return value.toLocaleString()
      return value.toString()
    }
  
    return (
      <div className="border-b py-2">
        <h4 className="font-semibold text-sm capitalize text-gray-600">{label.replace(/_/g, ' ')}</h4>
        <div className="text-gray-900 text-base">{renderValue()}</div>
      </div>
    )
  }
  
  const DetailSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-4">
      <h3 className="text-lg font-bold mb-2 border-b pb-1 text-primary">{title}</h3>
      <div className="grid grid-cols-2 gap-x-8 gap-y-2">
        {children}
      </div>
    </div>
  )
  
  const LocationDetails = ({ item }: { item: Location }) => (
    <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="economics">Economics</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
            <DetailSection title="General Information">
                <DetailItem label="Name" value={item.name} />
                <DetailItem label="Description" value={item.description} />
                <DetailItem label="Is Active" value={item.is_active} />
                <DetailItem label="Type" value={item.type} />
                <DetailItem label="Status" value={item.properties.status} />
                <DetailItem label="Source URL" value={item.source_url} />
                <DetailItem label="Created At" value={new Date(item.created_at).toLocaleString()} />
                <DetailItem label="Updated At" value={new Date(item.updated_at).toLocaleString()} />
            </DetailSection>
        </TabsContent>
        <TabsContent value="address">
            <div className="grid grid-cols-2 gap-x-8">
                <div>
                    <DetailSection title="Address">
                        <DetailItem label="Address" value={item.properties.address} />
                        <DetailItem label="City" value={item.properties.city} />
                        <DetailItem label="State" value={item.properties.state_code} />
                        <DetailItem label="County" value={item.properties.county} />
                    </DetailSection>
                    <DetailSection title="Geospatial">
                        <DetailItem label="Latitude" value={item.geom.coordinates[1]} />
                        <DetailItem label="Longitude" value={item.geom.coordinates[0]} />
                    </DetailSection>
                </div>
                <div>
                    <MapDisplay coordinates={{ lat: item.geom.coordinates[1], lng: item.geom.coordinates[0] }} />
                </div>
            </div>
        </TabsContent>
        <TabsContent value="demographics">
            {item.properties.demographics && (
                <DetailSection title="Demographics">
                {Object.entries(item.properties.demographics).map(([key, value]) => (
                    <DetailItem key={key} label={key} value={value} />
                ))}
                </DetailSection>
            )}
        </TabsContent>
        <TabsContent value="economics">
            {item.properties.economics && (
                <DetailSection title="Economics">
                {Object.entries(item.properties.economics).map(([key, value]) => (
                    <DetailItem key={key} label={key} value={value} />
                ))}
                </DetailSection>
            )}
        </TabsContent>
        <TabsContent value="business">
            {item.properties.business_metrics && (
                <DetailSection title="Business Metrics">
                {Object.entries(item.properties.business_metrics).map(([key, value]) => (
                    <DetailItem key={key} label={key} value={value} />
                ))}
                </DetailSection>
            )}
        </TabsContent>
    </Tabs>
  )
  
  const TerritoryDetails = ({ item }: { item: Territory }) => (
    <>
        <DetailSection title="General Information">
            <DetailItem label="Name" value={item.name} />
            <DetailItem label="Description" value={item.description} />
            <DetailItem label="Is Active" value={item.is_active} />
            <DetailItem label="Created At" value={new Date(item.created_at).toLocaleString()} />
            <DetailItem label="Updated At" value={new Date(item.updated_at).toLocaleString()} />
        </DetailSection>
    </>
  )
  
  export function DetailsDialog({ isOpen, onOpenChange, onEdit, item, itemType, title }: DetailsDialogProps) {
    if (!item) return null
  
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>{title}</DialogTitle>
            <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-4">
            {itemType === 'location' && <LocationDetails item={item} />}
            {itemType === 'territory' && <TerritoryDetails item={item} />}
          </div>
        </DialogContent>
      </Dialog>
    )
  }
