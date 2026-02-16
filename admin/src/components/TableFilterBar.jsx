import { Row, Col, Input, Select, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { GlassButton } from './GlassUI'

export default function TableFilterBar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  searchColSpan = 8,
  filterItems = [],
  summaryNode = null,
  onReset,
  onRefresh,
  resetText,
  refreshText,
  refreshLoading = false
}) {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      {onSearchChange ? (
        <Col span={searchColSpan}>
          <Input
            placeholder={searchPlaceholder}
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            allowClear
          />
        </Col>
      ) : null}

      {(filterItems || []).map((item, index) => (
        <Col span={item?.span || 4} key={item?.key || `filter-${index}`}>
          <Select
            style={{ width: '100%' }}
            value={item?.value}
            onChange={item?.onChange}
            options={item?.options || []}
          />
        </Col>
      ))}

      <Col flex='auto' style={{ textAlign: 'right' }}>
        <Space>
          {summaryNode}
          {onReset ? <GlassButton onClick={onReset}>{resetText}</GlassButton> : null}
          {onRefresh ? (
            <GlassButton type='primary' onClick={onRefresh} loading={refreshLoading}>
              {refreshText}
            </GlassButton>
          ) : null}
        </Space>
      </Col>
    </Row>
  )
}
